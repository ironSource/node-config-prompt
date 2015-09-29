#!/usr/bin/env node
'use strict';

var meow = require('meow')
  , colors = require('chalk')
  , Store = require('./')

var green = colors.green
  , blue = colors.blue
  , yellow = colors.yellow
  , gray = colors.gray
  , bgRed = colors.bgRed

var cli = meow({
  help: [
    'Usage',
    '  $ config-prompt [--command] module1 [, module2, ..]',
    '',
    'Commands',
    '  --print    The default command: show config of each module.',
    '  --prompt   Prompt to overwrite config values for each module.',
    '  --trash    Move config of each to trash after confirmation.',
    '  --env      Show config of each as CONSTANT_CASE environment variables.',
    '  --json     Print config of all modules as JSON.',
    '  --version  Show version.',
    '  --help     This help text.',
    '',
    'Examples',
    '  $ config-prompt my-aws-module',
    '    Config for ' + blue('my-aws-module') + ' at ' + gray('~/.config/configstore/my-aws-module.json'),
    '',
    '    * ' + yellow('aws_region') + ' ' + blue('us-west-1'),
    '',
    '  $ config-prompt --trash beep boop',
    '    ' + green('?') + ' Are you sure you want to remove the ' + blue('beep') + ' config? ' + blue('No'),
    '    ' + green('?') + ' Are you sure you want to remove the ' + blue('boop') + ' config? ' + blue('Yes'),
    '    * Moving ' + gray('~/.config/configstore/boop.json') + ' to the trash',
    '',
    '  $ config-prompt --prompt my-aws-module',
    '    Config for ' + blue('my-aws-module') + ' at ' + gray('~/.config/configstore/my-aws-module.json'),
    '    ' + green('? ') + yellow('aws_region') + blue(' undefined'),
    '    ' + green('? ') + yellow('aws_s3_bucket') + blue(' my-s3-bucket'),
    '',
    '    ' + bgRed('*')  + ' aws_region is required.',
    '',
    '    ' + green('? ') + yellow('aws_region') + blue(' us-east-1')
  ]
}, {
  boolean: ['trash', 'prompt', 'print', 'env', 'json']
})

var modules = cli.input.slice()
  , flags = cli.flags

if (!modules.length) {
  cli.showHelp()
  process.exit()
}

if (flags.json) var accJSON = {}

;(function next(err) {
  if (err) throw err

  if (!modules.length) {
    if (accJSON) console.log(JSON.stringify(accJSON, null, '  '))
    return
  }

  var name = modules.shift()
    , store = Store(name)

  if (flags.prompt) {
    store.prompt({ all: true, nodeEnv: false }, next)
  } else if (flags.env) {
    store.print({ env: true }, next)
  } else if (accJSON) {
    accJSON[name] = store.all
    setImmediate(next)
  } else if (flags.trash) {
    store.trash(next)
  } else {
    store.print(next)
  }
})()


