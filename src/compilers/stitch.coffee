fs = require 'fs'
path = require 'path'
stitch = require 'stitch'
uglify = require 'uglify-js'
helpers = require '../helpers'
{ConcatenatingCompiler} = require './base'

class exports.StitchCompiler extends ConcatenatingCompiler
  patterns: [/(app|vendor)\/.*\.(js|coffee)$/]
  destination: 'scripts/app.js'

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

  map: (file, callback) ->
    callback null, null

  reduce: (memo, file, callback) ->
    callback null, null

  # write() takes nothing as a first argument.
  write: (undef, callback) ->
    @package().compile (error, source) =>
      return @logError error if error?
      @globalWriteQueue.add
        data: if @options.minify then @minify source else source
        destinationPath: @getBuildPath @destination
        onWrite: callback
