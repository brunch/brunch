fs = require 'fs'
path = require 'path'
fileUtil = require 'file' 
compilers = require './compilers'
filewriter = require './filewriter'
helpers = require './helpers'
testrunner = require './testrunner'

exports.VERSION = require('./package').version
exports.Brunch = class Brunch
  defaultConfig:
    rootPath: './'
    dependencies: []
    minify: no
    mvc: 'backbone'
    templates: 'eco'
    styles: 'css'
    tests: 'jasmine'
    templateExtension: 'eco'  # Temporary.

  constructor: (options) ->
    options = helpers.extend @defaultConfig, options
    # Nomnom arg parser creates properties in options for internal use
    # We don't need them.
    ignored = ['_'].concat [0..10]
    for prop in ignored when prop of options
      delete options[prop]
    @options = options
    @options.buildPath ?= path.join options.rootPath, 'build', ''
    @options.compilers = (new compiler @options for name, compiler of compilers)
    @watcher = new helpers.Watcher
    @writer = new filewriter.FileWriter
      order:
        'build/scripts/app.js':
          before: [
            'vendor/scripts/console-helper.js'
            'vendor/scripts/jquery-1.7.js'
            'vendor/scripts/underscore-1.1.7.js'
            'vendor/scripts/backbone-0.5.3.js'
          ]

        'build/styles/main.css':
          before: ['vendor/styles/normalize.css']
          after: ['vendor/styles/helpers.css']

  _makeCallback: (fn) ->
    => fn? this

  new: (callback) ->
    callback = @_makeCallback callback
    templatePath = path.join __dirname, '..', 'template', 'base'
    path.exists @options.rootPath, (exists) =>
      if exists
        helpers.logError "[Brunch]: can\'t create project: 
directory \"#{@options.rootPath}\" already exists"
        return

      fileUtil.mkdirsSync @options.rootPath, 0755
      fileUtil.mkdirsSync @options.buildPath, 0755

      helpers.recursiveCopy templatePath, @options.rootPath, =>
        helpers.log '[Brunch]: created brunch directory layout'
        callback()
    this

  build: (callback) ->
    callback = @_makeCallback callback
    @watch =>
      @watcher.clear()
      callback()
    this

  watch: (callback) ->
    callback = @_makeCallback callback
    helpers.createBuildDirectories @options.buildPath
    timer = null

    @watcher
      .add(path.join @options.rootPath, 'app')
      .add(path.join @options.rootPath, 'vendor')
      .on 'change', (file) =>
        @options.compilers
          .filter (compiler) => 
            compiler.matchesFile file
          .forEach (compiler) =>
            compiler.compile file, (error, result) =>
              return if error?
              @writer.emit 'change', result if result?.path
      .on 'remove', (file) =>
        @writer.emit 'remove', file
    @writer.on 'write', callback
    this

  stopWatching: (callback) ->
    @watcher.clear()

  test: (callback) ->
    callback = @_makeCallback callback
    testrunner.run @options, callback

  generate: (callback) ->
    callback = @_makeCallback callback
    extension = switch @options.generator
      when 'style' then 'styl'
      when 'template' then 'eco'
      else 'coffee'
    filename = "#{@options.name}.#{extension}"
    filePath = path.join @options.rootPath, 'app', "#{@options.generator}s", filename
    data = switch extension
      when 'coffee'
        className = helpers.formatClassName @options.name
        genName = helpers.capitalize @options.generator
        "class exports.#{className} extends Backbone.#{genName}\n"
      else
        ''

    fs.writeFile filePath, data, (error) ->
      return helpers.logError error if error?
      helpers.log "Generated #{filePath}"
    this

for method in ['new', 'build', 'watch', 'test', 'generate']
  do (method) ->
    exports[method] = (options, callback) ->
      (new Brunch options)[method] callback
