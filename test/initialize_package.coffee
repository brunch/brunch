require.paths.unshift __dirname + "/../lib"

testCase = require('nodeunit').testCase
StitchCompiler = require(__dirname + "/../lib/compilers").StitchCompiler

module.exports = testCase(
  'creates a valid stitch package': (test) ->
    test.expect 2

    options = {}
    options.dependencies = [
      'ConsoleDummy.js',
      'jquery-1.6.2.js',
      'underscore-1.1.7.js',
      'backbone-0.5.2.js'
    ]
    options.brunchPath = 'test/fixtures/base'

    compiler = new StitchCompiler options

    package = compiler.package()
    test.deepEqual package.paths, ['test/fixtures/base/src/app/']
    test.strictEqual package.dependencies[0], 'test/fixtures/base/src/vendor/ConsoleDummy.js'
    test.done()
)
