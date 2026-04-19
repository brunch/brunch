coffeescript = require 'coffee-script'
{BaseLanguage} = require './base'

class exports.CoffeeScriptLanguage extends BaseLanguage
  compile: (path, callback) ->
    @readFile path, (error, data) ->
      return callback error if error?
      try
        callback null, coffeescript.compile data
      catch error
        callback error
