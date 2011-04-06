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

# vows.describe('brunch tool').addBatch(
#   'when creating a new project':
#     topic: ->
#       brunch.new 'app', {projectTemplate: "base", templateExtension: "eco"}, @callback
#
#     'a new directory brunch should be created': (topic) ->
#       brunchStat = fs.statSync 'brunch'
#       assert.isObject brunchStat
#     'the brunch directory should contain the same files like in the template':
#       'check for same files'
#     teardown: ->
#       rmDirRecursive 'brunch'
#
#   'when building a project':
#     'the build directory should have changed':
#       'check for changes in build directory'
#
#   'when watching a project':
#     'it should regcognize changes in brunch src files':
#       'check if callback or dispatch is called'
#     'it should run expess server':
#       'check content via zombiejs or phnatomjs'
# ).export module

module.exports = testCase(
  setUp: (callback) ->
    brunch.new 'app', {projectTemplate: "base", templateExtension: "eco"}, callback
  tearDown: (callback) ->
    rmDirRecursive 'brunch'
    callback()
  'creating a new project': (test) ->
    test.expect 1
    brunchStat = fs.statSync 'brunch'
    test.strictEqual typeof(brunchStat), 'object'
    test.done()
)
