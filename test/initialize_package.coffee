require.paths.unshift __dirname + "/../src"

brunch  = require 'brunch'
testCase = require('nodeunit').testCase

module.exports = testCase(
  'creates a valid stitch package': (test) ->
    test.expect 2

    package = brunch.initializePackage('brunch')
    test.deepEqual package.paths, ['brunch/src/app/']
    test.strictEqual package.dependencies[0], 'brunch/src/vendor/ConsoleDummy.js'
    test.done()
)
