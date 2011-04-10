require.paths.unshift __dirname + "/../lib"

brunch  = require 'brunch'
testCase = require('nodeunit').testCase

module.exports = testCase(
  'creates a valid stitch package': (test) ->
    test.expect 2

    package = brunch.initializePackage('test/fixtures/base')
    test.deepEqual package.paths, ['test/fixtures/base/src/app/']
    test.strictEqual package.dependencies[0], 'test/fixtures/base/src/vendor/ConsoleDummy.js'
    test.done()
)
