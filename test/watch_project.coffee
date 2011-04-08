require.paths.unshift __dirname + "/../src"

brunch  = require 'brunch'
fs      = require 'fs'
exec    = require('child_process').exec
testCase = require('nodeunit').testCase
zombie = require 'zombie'

rmDirRecursive = (destination) ->
  exec 'rm -R ' + destination, (error, stdout, stderr) ->
    console.log(stdout) if stdout
    console.log(stderr) if stderr
    console.log(error) if error

# TODO split into smaller tests
# watching in general (generate a valid brunch app)
# watching with a nested brunch path
# add check if dispatch is called when js, coffee, styl, template file change
module.exports = testCase(
  setUp: (callback) ->
    brunch.new {projectTemplate: 'express', templateExtension: 'eco', brunchPath: 'brunch'}, ->
      setTimeout(
        ->
          brunch.watch {templateExtension: 'eco', expressPort: '8080', brunchPath: 'brunch'}
          setTimeout(
            ->
              callback()
            2000
          )
        500
      )
  tearDown: (callback) ->
    rmDirRecursive 'brunch'
    brunch.stop()
    callback()
  'creates a valid brunch app': (test) ->
    test.expect 1
    zombie.visit('http://localhost:8080', (err, browser, status) ->
      throw err.message if err
      test.strictEqual browser.html('h1'), '<h1>Welcome to Brunch</h1>'
      test.done()
    )
)
