require.paths.unshift __dirname + "/../lib"

helpers  = require 'helpers'
testCase = require('nodeunit').testCase

module.exports = testCase(
  'filter file list for dotfiles and directories': (test) ->
    test.expect 1

    dependencyPaths = helpers.filterFiles [
      'ConsoleDummy.js',
      '.to_be_ignored',
      'should_be_ignored',
    ], 'test/fixtures/alternate_vendor'
    test.deepEqual dependencyPaths, [ 'ConsoleDummy.js' ]
    test.done()
)
