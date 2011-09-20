fs = require "fs"
path = require "path"
stitch = require "stitch"
uglify = require "uglify-js"
_ = require "underscore"

brunch = require "../brunch"
helpers = require "../helpers"
{Compiler} = require "./base"


class exports.StitchCompiler extends Compiler
  constructor: (rootPath, options) ->
    super
    @vendorPath = "src/vendor/"

  package: ->
    @_package ?= stitch.createPackage
      dependencies: @collectDependencies()
      paths: [@generatePath('src/app/')]

  # Generate list of dependencies and preserve order of brunch libaries,
  # like defined in options.stitch.dependencies.
  collectDependencies: ->
    filenames = helpers.filterFiles (fs.readdirSync @generatePath(@vendorPath)), @generatePath(@vendorPath)

    args = @options.dependencies.slice()
    args.unshift filenames
    additionalLibaries = _.without.apply @, args
    dependencies = @options.dependencies.concat additionalLibaries
    _.map dependencies, (filename) => @generatePath path.join(@vendorPath, filename)

  minify: (source) ->
    {parse} = uglify.parser
    {ast_mangle, ast_squeeze, gen_code} = uglify.uglify
    @log "minified"
    gen_code ast_squeeze ast_mangle parse source

  compile: (files) ->
    # update package dependencies in case a dependency was added or removed
    if _.any files, ((file) -> file.match /src\/vendor\//)
      @package().dependencies = @collectDependencies()

    @package().compile (error, source) =>
      return @logError error if error?
      @log "compiled"
      source = @minify source if @options.minify
      @writeToFile @options.output, source
