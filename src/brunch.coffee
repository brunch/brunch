# Brunch can be used via command-line tool or manually by calling run(options).

root = __dirname + "/../"

fs = require "fs"
path = require "path"
fileUtil = require "file"

helpers = require "./helpers"
testrunner = require "./testrunner"


exports.VERSION = require("./package").version


exports.Brunch = class Brunch
  _createDirectories: (buildPath, directories...) ->
    for dirPath in directories
      fileUtil.mkdirsSync path.join(buildPath, dirPath), 0755

  # Creates an example index.html for brunch with the correct relative
  # path to the build directory.
  _createExampleIndex: (filePath, buildPath) ->
    # Fixing relative path.
    appPath = path.join @options.appPath, "/"
    if appPath in buildPath
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
    total = @compilers.length
    for compiler in compilers
      do => compiler.compile ["."], =>
        # Pop current compiler from queue.
        total -= 1
        # Execute callbacks if compiler queue is empty.
        if total <= 0
          testrunner.run @options
          callback?()

  new: (callback) ->
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
        helpers.logSuccess "[Brunch]: created brunch directory layout"
        callback?()

  build: (callback) ->
    @_createDirectories @options.buildPath, "web/css", "web/js"
    @_compile @compilers, callback

  watch: (callback) ->
    @_createDirectories @options.buildPath, "web/css", "web/js"
    opts =
      path: path.join @options.appPath, "src"
      callOnAdd: yes
    helpers.watchDirectory opts, (file) =>
      for compiler in @compilers when compiler.matchesFile file
        return compiler.onFileChanged file, =>
          testrunner.run @options
          callback?()

  constructor: (@options) ->
    @options.buildPath ?= path.join @options.appPath, "build/"
    all = require "./compilers"
    @compilers = (new compiler @options for name, compiler of all)

for method in ["new", "build", "watch"]
  do (method) ->
    exports[method] = (options, callback) ->
      (new Brunch options)[method] callback
