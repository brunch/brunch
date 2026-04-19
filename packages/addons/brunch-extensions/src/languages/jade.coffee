jade = require 'jade'
pathModule = require 'path'
{BaseLanguage} = require './base'

class exports.JadeLanguage extends BaseLanguage
  compile: (path, callback) ->
    @readFile path, (error, data) ->
      return callback error if error?
      try
        content = jade.compile data, 
          compileDebug: no,
          client: yes,
          filename: pathModule.filename path
        callback null, "module.exports = #{content};"
      catch error
        callback error
