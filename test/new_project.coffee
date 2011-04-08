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

exports.newProject =
  default: testCase(
    setUp: (callback) ->
      brunch.new {projectTemplate: "base", templateExtension: "eco", brunchPath: 'brunch'}, callback
    tearDown: (callback) ->
      rmDirRecursive 'brunch'
      callback()
    'directory has been created': (test) ->
      test.expect 1
      brunchStat = fs.statSync 'brunch'
      test.strictEqual typeof(brunchStat), 'object'
      test.done()
  )
  nestedDirectories: testCase(
    setUp: (callback) ->
      brunch.new {projectTemplate: 'base', templateExtension: 'eco', brunchPath: 'js/client'}, callback
    tearDown: (callback) ->
      rmDirRecursive 'js'
      callback()
    'directory provided by nested brunchPath has been created': (test) ->
      test.expect 1
      brunchStat = fs.statSync 'js/client/src'
      test.strictEqual typeof(brunchStat), 'object'
      test.done()
  )
