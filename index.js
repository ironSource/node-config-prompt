'use strict';

var ConfigStore = require('configstore')
  , isArray = require('isarray')
  , colors = require('chalk')
  , inquirer = require('inquirer')
  , xtend = require('xtend')
  , validator = require('is-my-json-valid')
  , path = require('path')
  , packpath = require('packpath')
  , trash = require('trash')
  , constantCase_ = require('constant-case')

module.exports = Store

function findName() {
  var parent = packpath.parent()
  if (!parent) throw new Error('Could not find parent package')

  var name = require(path.join(parent, 'package.json')).name
  if (!name) throw new Error('Could not find parent name')

  return name
}

function constantCase(s) {
  // BEEP123 instead of BEEP_123
  var cc = constantCase_(s).replace(/_(\d+)/g, function(match, p){
    return p
  })

  if (s[0] === '_' && cc[0] !== '_') cc = '_' + cc // Keep prefix
  return cc
}

function Store(name, schema) {
  if (arguments.length < 2 && typeof name !== 'string') {
    return new Store(findName(), name)
  }

  if (!(this instanceof Store)) return new Store(name, schema)
  
  if (typeof name !== 'string' || name === '') {
    throw new Error('The `name` argument is required and must be a string')
  }

  var defaults = {}, hasSchema = false

  if (typeof schema === 'object') {
    hasSchema = true
    this.keys = Object.keys(schema)

    this.keys.forEach(function(k) {
      var node = schema[k]
      if ('default' in node) defaults[k] = node.default
    })
  }

  ConfigStore.call(this, name, defaults)
  
  if (!hasSchema) {
    schema = Store.guessSchema(this.all || {})
    this.keys = Object.keys(schema)
  }
  
  this.schema = schema
  this.name = name
  this.prettyPath = colors.gray('~/.config/configstore/'+this.name+'.json')
  this.prettyName = colors.blue(this.name)
}

require('inherits')(Store, ConfigStore)

Store.guessSchema = function(values) {
  var schema = {}

  Object.keys(values).forEach(function(key){
    var node = { required: true }
      , type = typeof values[key]

    if (type === 'string' || type === 'boolean' || type === 'number') {
      node.type = type
      schema[key] = node
    }
  })

  return schema
}

// Override set() to limit the set of keys
Store.prototype.set = function (key, val) {
  if (this.schema[key] === undefined) {
    throw new Error('This key is not allowed: ' + key)
  }

  var config = this.all
  config[key] = val
  this.all = config
}

Store.prototype.env = Store.prototype.envify = function(override) {
  var env = { NODE_ENV: process.env.NODE_ENV }
    , all = this.all || {}

  this.keys.forEach(add, all)
  if (override != null) Object.keys(override).forEach(add, override)

  return env

  function add(key) {
    env[constantCase(key)] = this[key]
  }
}

Store.prototype.prompt = function(opts, done) {
  if (typeof opts === 'function') done = opts, opts = {}
  opts = xtend({ all: false, nodeEnv: true, silent: false }, opts)

  if (!opts.silent) {
    console.log('Config for %s at %s\n', this.prettyName, this.prettyPath)
  }

  var store = this
    , prevState = opts.values || this.all || {}
    , questions = []

  if (opts.keys) {
    var keys = opts.keys.filter(function(k){
      return this.indexOf(k) >= 0
    }, this.keys)
  } else {
    keys = this.keys
  }

  keys.forEach( function(key) {
    var prev = prevState[key]
      , missing = prev == null
      , schema = store.schema[key]
    
    if ((missing && schema.required) || opts.all) {
      var def = missing ? schema.default : prev
        , type = 'input'
        , filter = undefined

      if (schema.type === 'boolean') {
        type = 'confirm'
        def = !!def
      } else if (schema.type === 'number') {
        // Coerce to number
        filter = function(value) {
          if (typeof value !== 'string') return value
          if (value.trim().length === 0) return undefined
          var num = parseInt(value)
          return isNaN(num) ? undefined : num
        }
      } else if (schema.type === 'string') {
        // Catch empty values
        filter = function(value) {
          if (typeof value !== 'string') return value
          value = value.trim()
          return value === '' ? undefined : value
        }
      }

      questions.push({
        type: type,
        name: key,
        message: colors.yellow(key),
        default: def,
        filter: filter
      })
    }
  })

  if (opts.nodeEnv) {
    var node_env = process.env.NODE_ENV

    if (!node_env) {
      questions.push({
        name: '__node_env',
        type: 'confirm',
        default: true,
        message: 'NODE_ENV is not defined. Use ' + colors.yellow('production') + '?'
      })
    } else {
      console.log('* NODE_ENV is %s', colors.blue(node_env))
    }
  }

  if (questions.length === 0) {
    console.log('*', colors.yellow('No entries found.'))
    return done && setImmediate(done)
  }

  inquirer.prompt(questions, function(answers){
    var nextState = xtend(prevState)

    questions.forEach(function(q){
      var answer = answers[q.name]
        , schema = store.schema[q.name]
      
      if (q.name === '__node_env') {
        process.env.NODE_ENV = answer ? 'production' : 'development'
        return
      }

      // Merge answers
      nextState[q.name] = answer
    })

    var errors = store.validate(nextState)

    if (errors.length) {
      console.log('')

      var retry = []

      errors.forEach(function(error){
        var key = error.field.slice(5) // starts with "data."
        console.log('%s %s %s.', colors.bgRed('*'), key, error.message)

        // Restore previous value
        nextState[key] = prevState[key]
        retry.push(key)
      })

      console.log('')

      // Retry, using nextState as starting point
      return store.prompt(xtend(opts, { values: nextState, silent: true, keys: retry }), done)
    }

    store.all = nextState
    
    console.log('')
    done && done()
  })
}

Store.prototype.validate = function(values) {
  if (arguments.length === 0) values = this.all

  this.validator || (this.validator = validator({type: 'object', properties: this.schema}, {
    greedy: true
  }))

  this.validator(values)

  return this.validator.errors || []
}

Store.prototype.trash = function(done) {
  done || (done = function(e) { if (e) throw e })

  var store = this
    , prettyPath = this.prettyPath

  if (!store.size) {
    console.log('* Skipping empty %s at %s', this.prettyName, prettyPath)
    return setImmediate(done)
  }

  inquirer.prompt([{
    name: 'clear',
    type: 'confirm',
    default: false,
    message: 'Are you sure you want to remove the ' + this.prettyName + ' config?'
  }], function(answers){
    if (answers.clear !== true) return done()

    console.log('* Moving %s to the trash', prettyPath)

    trash([store.path], function(err){
      if (err) return done(err)
      store.all = {}
      done()
    })
  })
}

Store.prototype.print = function(opts, done) {
  if (typeof opts === 'function') done = opts, opts = {}

  console.log('Config for %s at %s\n', this.prettyName, this.prettyPath)

  var has = false

  if (opts && opts.env) {
    var env = this.envify()
    Object.keys(env).forEach(function(k){
      var val = env[k]
      if (val == null) return
      has = true
      console.log('*', colors.yellow(k), colors.blue(val))
    })
  } else {
    var all = this.all
    this.keys.forEach(function(k){
      if (k in all) {
        has = true
        console.log('*', colors.yellow(k), colors.blue(all[k]))
      }
    })
  }

  if (!has) {
    console.log('*', colors.yellow('No entries found.'))
  }

  console.log('')
  done && setImmediate(done)
}
