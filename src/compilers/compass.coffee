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
    defaultConfigPath = path.join(@options.brunchPath, "compass.config")

    onCompile = (err, stdout, stderr) ->
      if err?
        helpers.log colors.lred('compass err: ' + stderr)
      else
        helpers.log colors.green(stdout)

    path.exists defaultConfigPath, (configFound) ->
      if configFound
        exec "compass compile --config #{defaultConfigPath}", onCompile
      else
        compassOpts = [
          "--output-style compressed"
          "--sass-dir #{path.join(@options.brunchPath, 'src/app/styles')}"
          "--css-dir #{path.join(@options.brunchPath, 'build/web/css')}"
          "--images-dir #{path.join(@options.brunchPath, 'build/web/img')}"
          "--javascripts-dir #{path.join(@options.brunchPath, 'build/web/js')}"
          "--relative-assets"
        ].join(" ")
        exec "compass compile #{compassOpts}", onCompile