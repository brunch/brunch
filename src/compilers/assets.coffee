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
    console.log 'Compiling assets', files
    return
    files.forEach (file) ->
      helpers.copyFile file, @getBuildPath 
