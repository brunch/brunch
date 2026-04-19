eco = require 'eco'
{BaseLanguage} = require './base'

class exports.EcoLanguage extends BaseLanguage
  compile: (path, callback) ->
    @readFile path, (error, data) =>
      return callback error if error?
      try
        callback null, "module.exports = #{eco.compile data}"
      catch error
        callback error
