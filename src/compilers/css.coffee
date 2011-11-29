fs = require 'fs'
async = require 'async'

{Compiler} = require './base'


class exports.CSSCompiler extends Compiler
  @type: 'style'
  patterns: -> [/\.css$/]

  compile: (files, callback) ->
    resultFile = @getBuildPath 'web/css/main.css'
    return if '.' in files  # Temporary spike.
    console.log 'Compiling', files

    async.map files, fs.readFile, (error, data) =>
      return @logError error if error?
      async.reduce data, '', ((memo, item, cb) =>
        item = item.toString() if typeof item isnt 'string'
        cb null, memo + item
      ), (error, data) =>
        return @logError error if error?
        fs.writeFile resultFile, data, (error) =>
          return @logError error if error?
          @log()
          callback @getClassName()
