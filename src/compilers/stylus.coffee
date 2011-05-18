fs        = require 'fs'
path      = require 'path'
helpers   = require '../helpers'
colors    = require('../../vendor/termcolors').colors
stylus    = require 'stylus'

Compiler = require('./index').Compiler

class exports.StylusCompiler extends Compiler

  filePattern: ->
    [/\.styl$/]

  compile: (files) ->
    main_file_path = path.join(@options.brunchPath, 'src/app/styles/main.styl')
    fs.readFile(main_file_path, 'utf8', (err, data) =>
      if err?
        helpers.log colors.lred('stylus err: ' + err)
      else
        compiler = stylus(data)
          .set('filename', main_file_path)
          .set('compress', true)
          .include(path.join(@options.brunchPath, 'src'))

        if @nib()
          compiler.use(@nib())

        compiler.render (err, css) =>
          if err?
            helpers.log colors.lred('stylus err: ' + err)
          else
            fs.writeFile(path.join(@options.buildPath, 'web/css/main.css'), css, 'utf8', (err) =>
              if err?
                helpers.log colors.lred('stylus err: ' + err)
              else
                helpers.log "stylus:   #{colors.green('compiled', true)} main.css\n"
            )
    )

  nib: ->
    @_nib ||= try
      if require('nib') then require('nib')() else false
    catch error
      false
