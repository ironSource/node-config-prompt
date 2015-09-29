# config-prompt

**Configuration store with a cli prompt and JSON Schema validation. Currently supports strings, booleans and numbers. Extends [configstore](https://github.com/yeoman/configstore), which synchronously saves the configuration to `~/.config/configstore/[module-name].json` on every change.**

[![npm status](http://img.shields.io/npm/v/config-prompt.svg?style=flat-square)](https://www.npmjs.org/package/config-prompt) [![Dependency status](https://img.shields.io/david/ironsource/node-config-prompt.svg?style=flat-square)](https://david-dm.org/ironsource/node-config-prompt)

## example

The basic API is the same as [configstore](https://github.com/yeoman/configstore), but the constructor takes a name (optional) and schema (see [api](#api) below).

```js
var config = require('config-prompt')({
  beep: { type: 'string', required: true },
  okay: { type: 'boolean', default: true }
})

config.set('beep', 'boop')
config.get('beep') // boop
config.all // { beep: 'boop', okay: true }
```

## usage with gulp

Put these tasks in a `config.js` file.

```js
const gulp = require('gulp')

const config = require('config-prompt')({
  myString: { type: 'string', required: true },
  myFlag:   { type: 'boolean', default: true }
})

// Show all config entries
gulp.task('config:print', done => config.print(done))

// Move the config file to trash. Asks for confirmation.
gulp.task('config:trash', done => config.trash(done))

// Prompt for missing config entries. Run this before any other task.
gulp.task('config:prompt', done => config.prompt(done))

// Allow other tasks to consume config
module.exports = config
```

Say some task needs the configuration. Simply `require()` your `config.js` and add `config:prompt` as a task dependency.

```js
const gulp = require('gulp')
const config = require('./config')

gulp.task('build', ['config:prompt'], done => {
  if (config.get('myFlag') === true) {
    // something
  }

  done()
})
```

Then, when a user runs `gulp build`, the user will be asked to provide any missing configuration entries.

## api

### `config = configPrompt([name][, schema])`

The name defaults to the name of the module (in `package.json`) that required `config-prompt` - i.e. the module parent. If no schema is provided, it will guess based on current configuration entries. E.g. a string value is added to the in-memory schema as `{ type: 'string', required: true }`.

#### `config.set(key, value)`

Set a value. Same as [configstore.set()](https://github.com/yeoman/configstore), but the key must be present in the schema. Note it does not validate on set.

#### `config.get(key)`

Get a value. Same as [configstore.get()](https://github.com/yeoman/configstore).

#### `config.all`

Getter and setter for all entries. Same as [configstore.all](https://github.com/yeoman/configstore).

#### `config.validate()`

Validate current entries according to the schema. Returns an array of errors in the form of `{ field: 'data.myKey', message: 'is required' }`

#### `config.envify([override])`

Returns an object with all entries as `CONSTANT_CASE` environment variables. Add extra entries in the override argument (not saved to the config). There's no enforced format for the keys. Snake, param, camel or pascal case, it's all good.

```js
// Returns { MY_KEY: 'foo', MY_NUM: 23, SOMETHING_ELSE: 'else' }
config.set('my-key', 'foo')
config.envify({ myNum: 23, something_else: 'else' })

```


#### `config.print([options,] callback)`

Prints configuration to console.

*options*

- `env` (bool, default false): print entries as `CONSTANT_CASE` environment variables, like `config.envify()`

#### `config.prompt([options,] callback)`

Prompts to overwrite or fill missing entries. Runs validation after all questions have been answered, then prompts again for invalid entries.

*options*

- `all` (bool, default false): prompt for all entries, not just the missing ones.
- `nodeEnv` (bool, default true): prompt to set `process.env.NODE_ENV` to either "development" or "production", if not set.

*<small>(!) If you happened to notice the additional options in the source: those are likely to be refactored out and should not be relied upon.</small>*

#### `config.trash(callback)`

Moves the configuration file to trash after confirmation.

## cli

You can manage multiple config stores with the included CLI. Install `config-prompt` globally and run `config-prompt` without any arguments to get started.

## install

With [npm](https://npmjs.org) do:

```
npm install config-prompt
```

## license

[MIT](http://opensource.org/licenses/MIT) © [ironSource](http://www.ironsrc.com/)
