fs = require 'fs'
path = require 'path'

helpers = require '../helpers'
{Compiler} = require './base'


class exports.AssetsCompiler extends Compiler
  patterns: -> [/app\/assets\//]

  compile: (files, callback) ->
    [from, to] = [(@getRootPath path.join 'app', 'assets'), @getBuildPath()]
    helpers.recursiveCopy from, to, (error, files) =>
      return @logError error if error?
      @log()
      callback @getClassName()
