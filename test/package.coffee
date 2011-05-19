require.paths.unshift __dirname + "/../lib"

testCase = require('nodeunit').testCase
package = require '../lib/package'

module.exports = testCase(
  'brunch version should be a string': (test) ->
    test.expect 1

    test.equal typeof(package.version), 'string'
    test.done()
)
