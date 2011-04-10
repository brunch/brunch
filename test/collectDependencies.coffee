require.paths.unshift __dirname + "/../lib"

brunch  = require 'brunch'
testCase = require('nodeunit').testCase

module.exports = testCase(
  'collect brunch dependencies': (test) ->
    test.expect 1

    dependencyPaths = brunch.collectDependencies('test/fixtures/base/src/vendor')
    test.deepEqual dependencyPaths, [
      'test/fixtures/base/src/vendor/ConsoleDummy.js',
      'test/fixtures/base/src/vendor/jquery-1.5.2.js',
      'test/fixtures/base/src/vendor/underscore-1.1.5.js',
      'test/fixtures/base/src/vendor/backbone-0.3.3.js'
    ]
    test.done()
  'collect brunch dependencies and backbone-localstorage - it should ignore dotfiles and directories': (test) ->
    test.expect 1

    dependencyPaths = brunch.collectDependencies('test/fixtures/vendor')
    test.deepEqual dependencyPaths, [
      'test/fixtures/vendor/ConsoleDummy.js',
      'test/fixtures/vendor/jquery-1.5.2.js',
      'test/fixtures/vendor/underscore-1.1.5.js',
      'test/fixtures/vendor/backbone-0.3.3.js',
      'test/fixtures/vendor/backbone-localstorage.js'
    ]
    test.done()
)
