require.paths.unshift __dirname + "/../lib"

brunch  = require 'brunch'
fs      = require 'fs'
spawn   = require('child_process').spawn
testCase = require('nodeunit').testCase
zombie = require 'zombie'

rmDirRecursive = (destination, callback) ->
  rm = spawn 'rm', ['-R', destination]

  rm.stderr.on 'data', (data) ->
    console.log "stderr: #{data}"

  rm.on 'exit', (code) ->
    callback() if typeof(callback) is 'function'

# TODO split into smaller tests
# watching in general (generate a valid brunch app)
# watching with a nested brunch path
# add check if dispatch is called when js, coffee, styl, template file change
module.exports = testCase(
  setUp: (callback) ->
    brunch.new {projectTemplate: 'express', templateExtension: 'eco', brunchPath: 'brunch', buildPath: 'brunch/build'}, ->
      brunch.watch {templateExtension: 'eco', expressPort: '8080', brunchPath: 'brunch', buildPath: 'brunch/build'}
      setTimeout(
        ->
          callback()
        3000
      )
  tearDown: (callback) ->
    brunch.stop()
    rmDirRecursive 'brunch', callback
  'creates a valid brunch app': (test) ->
    test.expect 1
    zombie.visit('http://localhost:8080', (err, browser, status) ->
      throw err.message if err
      test.strictEqual browser.html('h1'), '<h1>Welcome to Brunch</h1>'
      test.done()
    )
)
