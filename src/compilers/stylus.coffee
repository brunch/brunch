fs = require 'fs'
path = require 'path'
stylus = require 'stylus'

{Compiler} = require './base'


try
  nib = require('nib')()
catch error
  null


class exports.StylusCompiler extends Compiler
  patterns: -> [/\.styl$/]

  compile: (files, callback) ->
    resultFile = @getBuildPath path.join 'styles', 'main.css'
    mainFilePath = @getAppPath path.join 'src', 'app', 'styles', 'main.styl'

    fs.readFile mainFilePath, 'utf8', (error, data) =>
      return @logError error if error?
      compiler = stylus(data)
        .set('filename', mainFilePath)
        .set('compress', yes)
        .set('firebug', @options.stylus?.firebug)
        .include(@getAppPath 'src')

      if typeof @options.stylus?.paths is 'object'
        paths = (@getAppPath stylusPath for stylusPath in @options.stylus.paths)
        compiler.set('paths', paths)

      compiler.use nib if nib
      compiler.render (error, css) =>
        return @logError error if error?
        fs.readFile resultFile, (error, previousData) =>
          fs.writeFile resultFile, (previousData + css), (error) =>
            return @logError error if error?
            @log()
            callback @getClassName()
