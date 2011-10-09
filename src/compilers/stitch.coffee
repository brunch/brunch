fs = require "fs"
path = require "path"
stitch = require "stitch"
uglify = require "uglify-js"
_ = require "underscore"

helpers = require "../helpers"
{Compiler} = require "./base"


class exports.StitchCompiler extends Compiler
  constructor: (options) ->
    super
    @vendorPath = @getAppPath "src/vendor"

  patterns: ->
    [/\.coffee$/, /src\/.*\.js$/, new RegExp "#{@options.templateExtension}$"]

  # Generate list of dependencies and preserve order of brunch libaries,
  # like defined in options.dependencies.
  collectDependencies: ->
    filenames = helpers.filterFiles (fs.readdirSync @vendorPath), @vendorPath
    args = @options.dependencies.slice()
    args.unshift filenames
    additionalLibaries = _.without.apply @, args
    dependencies = @options.dependencies.concat additionalLibaries
    dependencies.map (filename) => path.join @vendorPath, filename

  package: ->
    @_package ?= stitch.createPackage
      dependencies: @collectDependencies()
      paths: [@getAppPath "src/app/"]

  minify: (source) ->
    {parse} = uglify.parser
    {ast_mangle, ast_squeeze, gen_code} = uglify.uglify
    @log "minified"
    gen_code ast_squeeze ast_mangle parse source

  compile: (files, callback) ->
    # update package dependencies in case a dependency was added or removed
    if files.some((file) -> file.match /src\/vendor\//)
      @package().dependencies = @collectDependencies()

    @package().compile (error, source) =>
      return @logError error if error?
      @log "compiled"
      source = @minify source if @options.minify
      outPath = @getBuildPath "web/js/app.js"
      fs.writeFile outPath, source, (error) =>
        return @logError "couldn't write compiled file. #{error}" if error?
        callback @getClassName()
