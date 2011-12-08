fs = require 'fs'
path = require 'path'
stitch = require 'stitch'
uglify = require 'uglify-js'

helpers = require '../helpers'
{Compiler} = require './base'

class exports.StitchCompiler extends Compiler
  patterns: [/(app|vendor)\/.*\.(js|coffee)$/]

  collect: ->
    directory = @getRootPath 'vendor', 'scripts'
    fileNames = helpers.filterFiles (fs.readdirSync directory), directory
    # Generate list of dependencies and preserve order of brunch libaries,
    # like defined in options.dependencies.
    fileNames = @options.dependencies.concat fileNames.filter (fileName) =>
      fileName not in @options.dependencies
    fileNames.map (fileName) => path.join directory, fileName

  package: ->
    @_package ?= stitch.createPackage
      dependencies: @collect()
      paths: [@getRootPath 'app']

  minify: (source) ->
    {parse} = uglify.parser
    {ast_mangle, ast_squeeze, gen_code} = uglify.uglify
    gen_code ast_squeeze ast_mangle parse source

  compile: (files, callback) ->
    # update package dependencies in case a dependency was added or removed
    if files.some((file) -> file.match /vendor\//)
      @package().dependencies = @collect()

    @package().compile (error, source) =>
      return @logError error if error?
      if @options.minify
        callback @minify source
      else
        callback source
