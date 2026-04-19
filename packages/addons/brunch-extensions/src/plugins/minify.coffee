async = require 'async'
cleanCSS = require 'clean-css'
uglify = require 'uglify-js'
{BasePlugin} = require './base'

{gen_code, ast_squeeze, ast_mangle} = uglify.uglify
{parse} = uglify.parser

minify = (file, callback) ->
  minified = null
  err = null
  switch file.path.split('.').pop()
    when 'js'
      try
        minified = gen_code ast_squeeze ast_mangle parse file.data
      catch error
        err = "JS minify failed on #{file.path}: #{error}"
    when 'css'
      try
        minified = cleanCSS.process file.data
      catch error
        err = "CSS minify failed on #{file.path}: #{error}"
  process.nextTick ->
    file.data = minified or file.data
    callback err, file

class exports.MinifyPlugin extends BasePlugin
  load: (files, callback) ->
    async.map files, minify, callback
