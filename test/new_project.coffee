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
      brunch.new {projectTemplate: "base", templateExtension: "eco", brunchPath: 'brunch', buildPath: 'brunch/build'}, callback
    tearDown: (callback) ->
      rmDirRecursive 'brunch'
      callback()
    'default': (test) ->
      test.expect 2
      brunchStat = fs.statSync 'brunch'
      test.strictEqual typeof(brunchStat), 'object', 'directory has been created'
      buildStat = fs.statSync 'brunch/build'
      test.strictEqual typeof(buildStat), 'object', 'build directory has been created in brunch/build'
      test.done()
  )
  nestedDirectories: testCase(
    setUp: (callback) ->
      brunch.new {projectTemplate: 'base', templateExtension: 'eco', brunchPath: 'js/client', buildPath: 'js/output'}, callback
    tearDown: (callback) ->
      rmDirRecursive 'js'
      callback()
    'nested directory': (test) ->
      test.expect 2
      brunchStat = fs.statSync 'js/client/src'
      test.strictEqual typeof(brunchStat), 'object', 'directory provided by nested brunchPath has been created'
      buildStat = fs.statSync 'js/output'
      test.strictEqual typeof(buildStat), 'object', 'build directory has been created in js/output'
      test.done()
  )
