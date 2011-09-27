path = require('path')
jasmine = require('jasmine-node')
coffee = require('coffee-script')

exports.run = (options) ->
  testdir = path.resolve(options.brunchPath, 'test')
  console.log('Running tests in ' + testdir)
  require(testdir + '/spec')
