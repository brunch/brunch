coffeescript = require 'coffee-script'
{BaseLanguage} = require './base'

class exports.CoffeeScriptLanguage extends BaseLanguage
  compile: (file, callback) ->
    @readFile file, (error, data) ->
      callback error, coffeescript.compile data
