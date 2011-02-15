require.paths.unshift __dirname + "/../src"

vows    = require 'vows'
assert  = require 'assert'
brunch  = require 'brunch'
helpers = require 'helpers'
fs      = require 'fs'
exec    = require('child_process').exec
fileUtils = require 'file'

rmDirRecursive = (destination) ->
  exec 'rm -R ' + destination, (error, stdout, stderr) ->
    console.log(stdout) if stdout
    console.log(stderr) if stderr
    console.log(error) if error

vows.describe('brunch tool').addBatch(
  'when creating a new project':
    topic: ->
      brunch.new 'app', {projectTemplate: "base", templateExtension: "eco"}, @callback

    'a new directory brunch should be created': (topic) ->
      brunchStat = fs.statSync 'brunch'
      assert.isObject brunchStat
    'the brunch directory should contain the same files like in the template':
      'check for same files'
    teardown: ->
      rmDirRecursive 'brunch'

  'when building a project':
    'the build directory should have changed':
      'check for changes in build directory'

  'when watching a project':
    'it should regcognize changes in brunch src files':
      'check if callback or dispatch is called'

  'when dispatch is called':
    'with a coffee file':
      'it should recompile coffeescripts':
        'check for spawning coffee'
      'it should recompile documentation':
        'check for spawning docco'
    'with a template file':
      'it should recompile the templates':
        'check for spawning fusion'
    'with a stylesheet file':
      'it should recompile the stylesheets':
        'check for spawning stylus'
    'with a javascript file':
      'it should copy the file to build':
        'check if file exists in build'

  'when generate source-paths list':
    'it should generate a list including all coffee files':
      'check if list is complete'
).export module
