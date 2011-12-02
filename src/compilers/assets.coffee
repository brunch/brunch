fs = require 'fs'
path = require 'path'
stitch = require 'stitch'
uglify = require 'uglify-js'
_ = require 'underscore'

helpers = require '../helpers'
{Compiler} = require './base'


class exports.AssetsCompiler extends Compiler
  patterns: -> [/src\/app\/assets\//]

  compile: (files, callback) ->
    [from, to] = [(@getAppPath path.join 'src', 'app', 'assets'), @getBuildPath()]
    helpers.recursiveCopy from, to, (error, files) =>
      return @logError error if error?
      @log()
      callback @getClassName()
