# Brunch can be used via command-line tool or manually by calling run(options).

_ = require "underscore"
fs = require "fs"
path = require "path"
fileUtil = require "file"

helpers = require "./helpers"

exports.VERSION = require("./package").version
compilers = [] # Available compilers.

# Project skeleton generator.
exports.new = (rootPath, callback) ->
  templatePath = path.join(module.id, "/../../template/base")
  path.exists rootPath, (exists) ->
    if exists
      helpers.logError "[Brunch]: can't create project;
      directory already exists"
      helpers.exit()

    fileUtil.mkdirsSync rootPath, 0755

    helpers.recursiveCopy templatePath, rootPath, ->
      index = path.join rootPath, "index.html"
      exports.createExampleIndex index, callback
      helpers.logSuccess "[Brunch]: created brunch directory layout"

exports.watch = (rootPath, options) ->
  exports.initializeCompilers rootPath, options
  opts =
    path: path.join(rootPath, "src")
    callOnAdd: true

  # TODO: add callback "on first build".
  helpers.watchDirectory opts, exports.dispatch

exports.build = (rootPath, options) ->
  exports.initializeCompilers rootPath, options
  compiler.compile ["."] for compiler in compilers

# creates an example index.html for brunch with the correct relative path to the build directory
exports.createExampleIndex = (filePath, callback) ->
  index = """
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
      <link rel="stylesheet" href="build/web/css/main.css" type="text/css" media="screen">
      <script src="build/web/js/app.js"></script>
      <script>require('main');</script>
    </head>
    <body>
    </body>
    </html>
  """
  fs.writeFile(filePath, index, callback)

# initializes all used compilers
exports.initializeCompilers = (rootPath, options) ->
  compilers = for name, settings of options
    compiler = require('./compilers')["#{helpers.capitalize name}Compiler"]
    new compiler(rootPath, settings)

# Dispatcher for file watching which determines which action needs to be done
# according to the file that was changed/created/removed.
exports.dispatch = (file) ->
  for compiler in compilers when compiler.matchesFile file
    return compiler.onFileChanged file
