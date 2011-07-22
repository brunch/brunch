require.paths.unshift __dirname + "/../lib"

brunch  = require '../lib/brunch'
fs      = require 'fs'
testCase = require('nodeunit').testCase
zombie = require 'zombie'
testHelpers = require './lib/testHelpers'

options = {}

# TODO split into smaller tests
# watching in general (generate a valid brunch app)
# watching with a nested brunch path
# add check if dispatch is called when js, coffee, styl, template file change
# add check for different buildPath
# add test for base template as well (obstacle: zombie currently doesn't support file://)
module.exports = testCase(
  setUp: (callback) ->
    options =
      projectTemplate: 'express'
      templateExtension: 'eco'
      brunchPath: 'brunch'
      buildPath: 'brunch/build'
      minify: false

    brunch.new options, ->
      options.dependencies = [
        'ConsoleDummy.js',
        'jquery-1.6.2.js',
        'underscore-1.1.7.js',
        'backbone-0.5.1.js'
      ]
      options.expressPort = '8080'
      brunch.watch options
      setTimeout(
        ->
          callback()
        2000
      )
  tearDown: (callback) ->
    brunch.stop()
    testHelpers.removeDirectory 'brunch', callback
  'creates a valid brunch app': (test) ->
    test.expect 1
    zombie.visit('http://localhost:8080', (err, browser, status) ->
      throw err.message if err
      test.strictEqual browser.html('h1'), '<h1>brunch</h1>'
      test.done()
    )
  'update package dependencies when file has been added': (test) ->
    test.expect 1

    fs.writeFileSync('brunch/src/vendor/anotherLib.js', '//anotherLib', 'utf8')
    setTimeout(
      ->
        app = fs.readFileSync('brunch/build/web/js/app.js', 'utf8')
        test.ok app.match(/\/\/anotherLib/), 'app.js contains content of new created file anotherLib'
        test.done()
      400
    )
  'update package dependencies when file has been removed': (test) ->
    test.expect 1

    fs.writeFileSync('brunch/src/vendor/anotherLib.js', '//anotherLib', 'utf8')
    fs.unlinkSync('brunch/src/vendor/anotherLib.js')
    setTimeout(
      ->
        app = fs.readFileSync('brunch/build/web/js/app.js', 'utf8')
        test.ok (not app.match(/\/\/anotherLib/)), 'app.js contains content of new created file anotherLib'
        test.done()
      400
    )
  'app should work properly when minified': (test) ->
    test.expect 1

    brunch.stop()

    options.minify = true

    brunch.watch options
    setTimeout(
      ->
        zombie.visit('http://localhost:8080', (err, browser, status) ->
          throw err.message if err
          test.strictEqual browser.html('h1'), '<h1>brunch</h1>'
          test.done()
        )
      2000
    )
)
