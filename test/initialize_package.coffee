require.paths.unshift __dirname + "/../lib"

brunch  = require 'brunch'
testCase = require('nodeunit').testCase

module.exports = testCase(
  'creates a valid stitch package': (test) ->
    test.expect 2

    package = brunch.initializePackage('js/client')
    test.deepEqual package.paths, ['js/client/src/app/']
    test.strictEqual package.dependencies[0], 'js/client/src/vendor/ConsoleDummy.js'
    test.done()
)
