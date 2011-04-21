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

    package = brunch.initializePackage('test/fixtures/base')
    test.deepEqual package.paths, ['test/fixtures/base/src/app/']
    test.strictEqual package.dependencies[0], 'test/fixtures/base/src/vendor/ConsoleDummy.js'
    test.done()
)
