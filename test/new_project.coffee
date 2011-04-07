require.paths.unshift __dirname + "/../src"

brunch  = require 'brunch'
fs      = require 'fs'
exec    = require('child_process').exec
testCase = require('nodeunit').testCase

rmDirRecursive = (destination) ->
  exec 'rm -R ' + destination, (error, stdout, stderr) ->
    console.log(stdout) if stdout
    console.log(stderr) if stderr
    console.log(error) if error

module.exports = testCase(
  setUp: (callback) ->
    brunch.new 'app', {projectTemplate: "base", templateExtension: "eco"}, callback
  tearDown: (callback) ->
    rmDirRecursive 'brunch'
    callback()
  'directory has been created': (test) ->
    test.expect 1
    brunchStat = fs.statSync 'brunch'
    test.strictEqual typeof(brunchStat), 'object'
    test.done()
)
