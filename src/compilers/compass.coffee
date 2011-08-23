fs        = require 'fs'
path      = require 'path'
helpers   = require '../helpers'
colors    = require('../../vendor/termcolors').colors
exec      = require('child_process').exec

Compiler = require('./base').Compiler

class exports.CompassCompiler extends Compiler

  filePattern: ->
    [/\.sass|.scss$/]

  compile: (files) ->
    compassOpts = [
      "--output-style compressed"
      "--sass-dir #{path.join(@options.brunchPath, 'src/app/styles')}"
      "--css-dir #{path.join(@options.brunchPath, 'build/web/css')}"
      "--images-dir #{path.join(@options.brunchPath, 'build/web/img')}"
      "--javascripts-dir #{path.join(@options.brunchPath, 'build/web/js')}"
    ].join(" ")

    exec "compass compile #{compassOpts}", (err, stdout) ->
      if err?
        helpers.log colors.lred('compass err: ' + stdout)
      else
        helpers.log colors.green(stdout)