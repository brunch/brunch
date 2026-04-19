require.paths.unshift __dirname + "/../src"

vows    = require 'vows'
assert  = require 'assert'
fusion  = require 'fusion'

compileTemplate = fusion.compileTemplate

vows.describe('load and setup settings').addBatch(
  'when loading settings from a file':
    topic: ->
      fusion.loadSettingsFromFile(__dirname + "/fixtures/settings.yaml")

    'it should return a settings object': (topic) ->
      assert.deepEqual topic,
        input: 'test/fixtures/templates'
        output: 'test/fixtures/templates.js'
        namespace: 'window'
        templateExtension: 'html'
        hook: 'hook.js'

  'when loading default settings':
    topic: ->
      fusion.loadDefaultSettings({})

    'it should return a settings object with default values': (topic) ->
      assert.deepEqual topic,
        input: 'templates'
        output: 'templates.js'
        namespace: 'window'
        templateExtension: 'html'
        hook: 'fusion_hooks.js'

  'when loading test hooks':
    topic: ->
      fusion.loadHooks 'test/fixtures/hooks.js', fusion

    'compileTemplate method should return a test string': (topic) ->
      assert.isString topic.compileTemplate("")
      assert.equal topic.compileTemplate(""), "hook test"
    teardown: ->
      fusion.compileTemplate = compileTemplate
).export module
