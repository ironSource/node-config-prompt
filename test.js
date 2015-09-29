var test = require('tape')
  , Store = require('./')
  , fs = require('fs')

test('constructor', function(t){
  Store('config-prompt').clear()

  t.test('with name', function(t){
    var store = Store('config-prompt-tmp')
    t.equal(store.name, 'config-prompt-tmp')

    fs.unlinkSync(store.path)
    t.end()
  })

  t.test('without name', function(t){
    var store = Store()
    t.equal(store.name, 'config-prompt')
    t.end()
  })

  t.test('with schema', function(t){
    var store = Store({ color: { type: 'string' }})
    t.deepEqual(store.schema, { color: { type: 'string' }})
    t.end()
  })

  t.test('without schema', function(t){
    var store = Store()
    t.deepEqual(store.schema, {})
    t.end()
  })

  t.test('schema sets defaults', function(t){
    var store = Store({ a: { type: 'string', default: 'beep' }})
    t.equal(store.get('a'), 'beep')
    t.end()
  })
})

test('set and get', function(t){
  var store = Store({ a: { type: 'string' }})
  store.clear()

  t.equal(store.get('a'), undefined, 'undefined if not set')
  store.set('a', null)
  t.equal(store.get('a'), null, 'can store null')
  t.throws(store.set.bind(store, 'b'), 'throws if key not in schema')

  t.end()
})
