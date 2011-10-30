# Brunch can be used via command-line tool or manually by calling run(options).

root = __dirname + "/../"

fs = require "fs"
path = require "path"
fileUtil = require "file" 

helpers = require "./helpers"
testrunner = require "./testrunner"


exports.VERSION = require("./package").version


exports.Brunch = class Brunch
  defaultConfig:
    appPath: "brunch"
    dependencies: []
    minify: no
    mvc: "backbone"
    templates: "eco"
    styles: "css"
    tests: "jasmine"
    templateExtension: "eco"  # Temporary.

  _createDirectories: (buildPath, directories...) ->
    for dirPath in directories
      fileUtil.mkdirsSync path.join(buildPath, dirPath), 0755

  # Creates an example index.html for brunch with the correct relative
  # path to the build directory.
  _createExampleIndex: (filePath, buildPath) ->
    # Fixing relative path.
    appPath = path.join @options.appPath, "/"
    if buildPath.indexOf(appPath) isnt -1
      relativePath = buildPath.substr appPath.length
    else
      relativePath = path.join "..", buildPath

    cssPath = path.join relativePath, "web/css/main.css"
    jsPath = path.join relativePath, "web/js/app.js"
    index = """
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <link rel="stylesheet" href="#{cssPath}" type="text/css" media="screen">
    <script src="#{jsPath}"></script>
    <script>require("main");</script>
  </head>
  <body>
  </body>
  </html>
    """
    fs.writeFileSync filePath, index

  _compile: (compilers, callback) ->
    total = compilers.length
    for compiler in compilers
      do (compiler) =>
        compiler.compile ["."], =>
          # Pop current compiler from queue.
          total -= 1
          # Execute callbacks if compiler queue is empty.
          if total <= 0
            testrunner.run @options, callback

  new: (callback) ->
    cb = (=> callback? @)
    templatePath = path.join module.id, "/../../template/base"
    path.exists @options.appPath, (exists) =>
      if exists
        helpers.logError "[Brunch]: can't create project;
        directory already exists"
        return

      fileUtil.mkdirsSync @options.appPath, 0755
      fileUtil.mkdirsSync @options.buildPath, 0755

      helpers.recursiveCopy templatePath, @options.appPath, =>
        index = path.join @options.appPath, "index.html"
        @_createExampleIndex index, @options.buildPath
        helpers.log "[Brunch]: created brunch directory layout"
        cb()
    @

  build: (callback) ->
    cb = (=> callback? @)
    @_createDirectories @options.buildPath, "web/css", "web/js"
    @_compile @compilers, cb
    @

  watch: (callback) ->
    cb = (=> callback? @)
    @_createDirectories @options.buildPath, "web/css", "web/js"
    sourcePath = path.join @options.appPath, "src"
    timer = null

    @watcher.add(sourcePath).onChange (file) =>
      for compiler in @compilers when compiler.matchesFile file
        return compiler.onFileChanged file, =>
          clearTimeout timer if timer
          # TODO: go full async & get rid of timers.
          timer = setTimeout (=> testrunner.run @options, cb), 20
    @

  stopWatching: (callback) ->
    @watcher.clear()

  constructor: (options) ->
    helpers.extend @defaultConfig, options
    options.buildPath ?= path.join options.appPath, "build/"
    # Nomnom arg parser creates properties in options for internal use
    # We don't need them.
    ignored = ["_"].concat [0..10]
    for prop in ignored when prop of options
      delete options[prop]
    @options = options

    all = require "./compilers"
    @compilers = (new compiler @options for name, compiler of all)
    @watcher = new helpers.Watcher


for method in ["new", "build", "watch"]
  do (method) ->
    exports[method] = (options, callback) ->
      (new Brunch options)[method] callback
