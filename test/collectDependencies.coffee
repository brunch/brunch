require.paths.unshift __dirname + "/../lib"

brunch  = require 'brunch'
testCase = require('nodeunit').testCase

module.exports = testCase(
  setUp: (callback) ->
    @orderedDependencies = [
      'ConsoleDummy.js',
      'jquery-1.5.2.js',
      'underscore-1.1.5.js',
      'backbone-master.js'
    ]
    callback()
  tearDown: (callback) ->
    @orderedDependencies = undefined
    callback()
  'collect brunch dependencies': (test) ->
    test.expect 1

    dependencyPaths = brunch.collectDependencies('test/fixtures/base/src/vendor', @orderedDependencies)
    test.deepEqual dependencyPaths, [
      'test/fixtures/base/src/vendor/ConsoleDummy.js',
      'test/fixtures/base/src/vendor/jquery-1.5.2.js',
      'test/fixtures/base/src/vendor/underscore-1.1.5.js',
      'test/fixtures/base/src/vendor/backbone-master.js'
    ]
    test.done()
  'collect brunch dependencies and backbone-localstorage - it should ignore dotfiles and directories': (test) ->
    test.expect 1

    dependencyPaths = brunch.collectDependencies('test/fixtures/alternate_vendor', @orderedDependencies)
    test.deepEqual dependencyPaths, [
      'test/fixtures/alternate_vendor/ConsoleDummy.js',
      'test/fixtures/alternate_vendor/jquery-1.5.2.js',
      'test/fixtures/alternate_vendor/underscore-1.1.5.js',
      'test/fixtures/alternate_vendor/backbone-master.js',
      'test/fixtures/alternate_vendor/backbone-localstorage.js'
    ]
    test.done()
)
