require.paths.unshift __dirname + "/../lib"

brunch  = require 'brunch'
fs      = require 'fs'
testCase = require('nodeunit').testCase
zombie = require 'zombie'
testHelpers = require './lib/testHelpers'

# TODO split into smaller tests
# watching in general (generate a valid brunch app)
# watching with a nested brunch path
# add check if dispatch is called when js, coffee, styl, template file change
module.exports = testCase(
  setUp: (callback) ->
    options =
      projectTemplate: 'express'
      templateExtension: 'eco'
      brunchPath: 'brunch'
      buildPath: 'brunch/build'

    brunch.new options, ->
      options.dependencies = [
        'ConsoleDummy.js',
        'jquery-1.5.2.js',
        'underscore-1.1.5.js',
        'backbone-master.js'
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
      test.strictEqual browser.html('h1'), '<h1>Welcome to Brunch</h1>'
      test.done()
    )
)
