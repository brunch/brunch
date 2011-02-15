require.paths.unshift __dirname + "/../src"

vows = require('vows')
assert = require('assert')
command = require('command')

vows.describe('command-line interface').addBatch(
  'when load options from arguments including templateExtension and projectTemplate':
    topic: ->
      command.loadOptionsFromArguments {templateExtension: "a", projectTemplate: "b"}, {}

    'it should return options':
      'including a defined templateExtension': (topic) ->
          assert.isString topic.templateExtension
      ,
      'including a defined projectTemplate': (topic) ->
          assert.isString topic.projectTemplate
).export module
