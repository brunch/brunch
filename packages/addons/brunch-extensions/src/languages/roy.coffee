roy = require 'roy'
{BaseLanguage} = require './base'

class exports.RoyLanguage extends BaseLanguage
  compile: (path, callback) ->
    @readFile path, (error, data) ->
      return callback error if error?
      try
        callback null, (roy.compile data).output
      catch error
        callback error
