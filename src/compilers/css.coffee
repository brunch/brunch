fs = require 'fs'
path = require 'path'
async = require 'async'

{Compiler} = require './base'


class exports.CSSCompiler extends Compiler
  @type: 'style'
  patterns: -> [/\.css$/]

  compile: (files, callback) ->
    resultFile = @getBuildPath path.join 'web', 'css', 'main.css'

    async.map files, fs.readFile, (error, data) =>
      return @logError error if error?
      async.reduce data, '', ((memo, item, cb) =>
        item = item.toString() if typeof item isnt 'string'
        cb null, memo + item
      ), (error, data) =>
        return @logError error if error?
        fs.readFile resultFile, (error, previousData) =>
          fs.writeFile resultFile, (previousData + data), (error) =>
            return @logError error if error?
            @log()
            callback @getClassName()
