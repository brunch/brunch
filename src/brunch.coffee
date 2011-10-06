# Brunch can be used via command-line tool or manually by calling run(options).

root = __dirname + "/../"

fs = require "fs"
path = require "path"
fileUtil = require "file"

helpers = require "./helpers"
testrunner = require "./testrunner"


exports.VERSION = require("./package").version


class Compilers
  _createDirectories: (buildPath, directories...) ->
    for dirPath in directories
      fileUtil.mkdirsSync path.join(buildPath, dirPath), 0755

  # Creates an example index.html for brunch with the correct relative
  # path to the build directory.
  _createExampleIndex: (filePath, buildPath) ->
    # Fixing relative path.
    brunchPath = path.join @options.brunchPath, "/"
    if buildPath.indexOf(brunchPath) is 0
      relativePath = buildPath.substr brunchPath.length
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

  compile: (compilers, callback) ->
    total = @compilers.length
    for compiler in compilers
      do => compiler.compile ["."], =>
        # Pop current compiler from queue.
        total -= 1
        # Execute callbacks if compiler queue is empty.
        unless total
          testrunner.run @options
          callback?() 

  create: (callback) ->
    templatePath = path.join module.id, "/../../template/base"
    path.exists @options.brunchPath, (exists) =>
      if exists
        helpers.logError "[Brunch]: can't create project;
        directory already exists"
        return

      fileUtil.mkdirsSync @options.brunchPath, 0755
      fileUtil.mkdirsSync @options.buildPath, 0755

      helpers.recursiveCopy templatePath, @options.brunchPath, =>
        index = path.join @options.brunchPath, "index.html"
        @_createExampleIndex index, @options.buildPath
        helpers.logSuccess "[Brunch]: created brunch directory layout"
        callback?()

  build: (callback) ->
    @_createDirectories @options.buildPath, "web/css", "web/js"
    @compile @compilers, callback

  watch: (callback) ->
    @_createDirectories @options.buildPath, "web/css", "web/js"
    opts =
      path: path.join @options.brunchPath, "src"
      callOnAdd: yes
    helpers.watchDirectory opts, (file) =>
      for compiler in @compilers when compiler.matchesFile file
        return compiler.onFileChanged file, =>
          testrunner.run @options
          callback?()

  constructor: (@options) ->
    all = require "./compilers"
    @compilers = (new compiler @options for name, compiler of all)


# Project skeleton generator.
exports.new = (options, callback) ->
  (new Compilers options).create callback

exports.watch = (options) ->
  (new Compilers options).watch()

exports.build = (options) ->
  (new Compilers options).build()
