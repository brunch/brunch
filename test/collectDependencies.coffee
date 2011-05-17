require.paths.unshift __dirname + "/../lib"

brunch  = require 'brunch'
testCase = require('nodeunit').testCase

module.exports = testCase(
  'collect brunch dependencies': (test) ->
    test.expect 1

    brunch.options = {}
    brunch.options.dependencies = [
      'ConsoleDummy.js',
      'jquery-1.5.2.js',
      'underscore-1.1.6.js',
      'backbone-master.js'
    ]
    brunch.options.brunchPath = 'test/fixtures/base'

    StitchCompiler = require(__dirname + "/../lib/compilers").StitchCompiler
    compiler = new StitchCompiler()

    dependencyPaths = compiler.collectDependencies()
    test.deepEqual dependencyPaths, [
      'test/fixtures/base/src/vendor/ConsoleDummy.js',
      'test/fixtures/base/src/vendor/jquery-1.5.2.js',
      'test/fixtures/base/src/vendor/underscore-1.1.6.js',
      'test/fixtures/base/src/vendor/backbone-master.js'
    ]
    test.done()
  'collect brunch dependencies and backbone-localstorage - it should ignore dotfiles and directories': (test) ->
    test.expect 1

    brunch.options = {}
    brunch.options.dependencies = [
      'ConsoleDummy.js',
      'jquery-1.5.2.js',
      'underscore-1.1.6.js',
      'backbone-master.js',
      'backbone-localstorage.js'
    ]

    StitchCompiler = require(__dirname + "/../lib/compilers").StitchCompiler
    compiler = new StitchCompiler()
    compiler._vendor_path = 'test/fixtures/alternate_vendor'

    dependencyPaths = compiler.collectDependencies()
    test.deepEqual dependencyPaths, [
      'test/fixtures/alternate_vendor/ConsoleDummy.js',
      'test/fixtures/alternate_vendor/jquery-1.5.2.js',
      'test/fixtures/alternate_vendor/underscore-1.1.6.js',
      'test/fixtures/alternate_vendor/backbone-master.js',
      'test/fixtures/alternate_vendor/backbone-localstorage.js'
    ]
    test.done()
)
