require.paths.unshift __dirname + "/../lib"

brunch  = require 'brunch'
testCase = require('nodeunit').testCase
fs = require 'fs'
path = require 'path'
testHelpers = require './lib/testHelpers'

module.exports = testCase(
  setUp: (callback) ->
    brunch.createBuildDirectories('output')
    callback()

  tearDown: (callback) ->
    testHelpers.removeDirectory 'output', callback

  'create directory structure for build path': (test) ->
    test.expect 2

    js = fs.statSync('output/web/js', 'utf8')
    css = fs.statSync('output/web/js', 'utf8')

    test.ok path.existsSync('output/web/js'), 'output/web/js exists'
    test.ok path.existsSync('output/web/css'), 'output/web/css exists'
    test.done()
)
