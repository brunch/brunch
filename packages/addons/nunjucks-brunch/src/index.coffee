nunjucks = require 'nunjucks'
fs = require 'fs'
path = require 'path'
mkdirp = require 'mkdirp'
_ = require 'lodash'

module.exports = class nunjucksBrunchPlugin
  brunchPlugin: yes
  type: 'template'
  extension: 'html'
  nunjucksOptions: {}

  publicPath: 'public'
  templatePath: 'app/views'
  projectPath: path.resolve process.cwd()

  filePatterns: /^app(\/|\\)views(\/|\\).*.html$/

  constructor: ( @config ) ->
    @configure()

  configure: ->
    if @config.plugins?.nunjucks?
      options = @config?.plugins?.nunjucks or @config.plugins.nunjucks
    else
      options = {}

    if options.filePatterns?
      @filePatterns = options.filePatterns

    if options.templatePath?
      @templatePath = options.templatePath

    if options.path?
      @publicPath = options.path

    @nunjucksOptions = _.omit options, 'filePatterns', 'path'

  templateFactory: ( templatePath, options, callback ) ->
    try
      env = new nunjucks.Environment( new nunjucks.FileSystemLoader ( path.dirname templatePath ) )
      template = env.render options.filename, options
    catch e
      error = e

    callback error, template

  compile: ( data, originalPath, callback ) ->
    # I am avoiding the use of the data variable. Using the file path
    # lets the template compile correctly when referencing other templates.
    templatePath = path.resolve originalPath
    relativePath = path.relative @projectPath, templatePath

    options = _.extend {}, @nunjucksOptions
    options.filename ?= path.basename relativePath

    successHandler = ( error, template ) =>
      if error?
        callback error
        return

      if relativePath.length
        publicPath = path.join @projectPath, @publicPath
        outputPath = relativePath.replace @templatePath, ''
        outputPath = path.join publicPath, outputPath
        outputDirectory = path.dirname outputPath

        # TODO: Save this block from an eternity in callback hell.
        mkdirp outputDirectory, ( err ) ->
          if err
            callback err, null
          else
            fs.writeFile outputPath, template, ( err, written, buffer ) ->
              if err
                callback err, null
              else
                callback()

      else
        callback null, "module.exports = #{template};"

    @templateFactory templatePath, options, successHandler
