stylus = require 'stylus'
fs = require 'fs'
{ConcatenatingCompiler} = require './base'

# NIB is an official stylus library of useful mixins etc.
# just like Compass.
try
  nib = require('nib')()
catch error
  null

class exports.StylusCompiler extends ConcatenatingCompiler
  patterns: [/\.styl$/]
  destination: 'styles/main.css'

  compile: (file, callback) ->
    @options ?= {}
    @queue.push file, (error, fileData) =>
      return callback error if error?
      compiler = stylus(fileData.toString())
        .set('compress', yes)
        .set('firebug', @options.stylus?.firebug)

      if typeof @options.stylus?.paths is 'object'
        paths = (@getRootPath stylusPath for stylusPath in @options.stylus.paths)
        compiler.set('paths', paths)

      compiler.use nib if nib
      compiler.render (error, data) =>
        callback error,
          destinationPath: @getBuildPath @destination
          path: @getRootPath file
          data: data.toString()
          onWrite: => @log()
