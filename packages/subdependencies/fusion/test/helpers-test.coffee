require.paths.unshift __dirname + "/../src"

vows = require('vows')
assert = require('assert')
helpers = require('helpers')

vows.describe('converting underscore names to camel case').addBatch(
  'when converting a name with multiple underscores':
    topic: ->
      helpers.underscoreToCamelCase "new_project_template"
    'it should be valid': (topic) ->
      assert.equal topic, "newProjectTemplate"

  'when converting a name with multiple underscores in a row':
    topic: ->
      helpers.underscoreToCamelCase "new__project"
    'it should remove both of them': (topic) ->
      assert.equal topic, "newProject"
  'when converting a name with upperscore letters in the beginning':
    topic: ->
      helpers.underscoreToCamelCase "NEW_project"
    'it shouldn\'t lower these first letters': (topic) ->
      assert.equal topic, "NEWProject"
  'when converting a name with upperscore letters somewhere':
    topic: ->
      helpers.underscoreToCamelCase "new_PROJECT"
    'it shouldn\'t lower these letters': (topic) ->
      assert.equal topic, "newPROJECT"
).export module
