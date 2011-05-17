require.paths.unshift __dirname + "/../lib"

brunch  = require 'brunch'
testCase = require('nodeunit').testCase

module.exports = testCase(
  'creates a valid stitch package': (test) ->
    test.expect 2

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

    package = compiler.package()
    test.deepEqual package.paths, ['test/fixtures/base/src/app/']
    test.strictEqual package.dependencies[0], 'test/fixtures/base/src/vendor/ConsoleDummy.js'
    test.done()
)
