# Brunch can be used via command-line tool or manually by calling run(options).

root = __dirname + "/../"

fs = require "fs"
path = require "path"
fileUtil = require "file"

helpers = require "./helpers"
testrunner = require "./testrunner"

exports.VERSION = require("./package").version
compilers = [] # Available compilers.


# Project skeleton generator.
exports.new = (options, callback) ->
  exports.options = options
  templatePath = path.join(module.id, "/../../template/base")
  path.exists exports.options.brunchPath, (exists) ->
    if exists
      helpers.logError "[Brunch]: can't create project;
      directory already exists"
      helpers.exit()

    fileUtil.mkdirsSync exports.options.brunchPath, 0755
    fileUtil.mkdirsSync exports.options.buildPath, 0755

    helpers.recursiveCopy templatePath, exports.options.brunchPath, ->
      index = path.join exports.options.brunchPath, "index.html"
      createExampleIndex index, exports.options.buildPath
      callback()
      helpers.logSuccess "[Brunch]: created brunch directory layout"


exports.watch  = (options) ->
  exports.options = options
  exports.createBuildDirectories exports.options.buildPath
  exports.initializeCompilers()
  opts =
    path: path.join(exports.options.brunchPath, "src")
    callOnAdd: true

  # TODO: add callback "on first build".
  helpers.watchDirectory opts, exports.dispatch


exports.build = (options) ->
  exports.options = options
  exports.createBuildDirectories exports.options.buildPath
  exports.initializeCompilers()
  compilerNames = (compiler.constructor.name for compiler in compilers)
  for compiler in compilers
    compiler.compile ["."], (compilerName) ->
      for name, idx in compilerNames
        if name == compilerName
          compilerNames.splice(idx, 1)
          # When all compilers have run, run the tests
          if compilerNames.length == 0
            testrunner.run(options)


# Creates an example index.html for brunch with the correct relative
# path to the build directory.
exports.createExampleIndex = createExampleIndex = (filePath, buildPath) ->
  # Fixing relative path.
  brunchPath = path.join exports.options.brunchPath, "/"
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


exports.initializeCompilers = ->
  compilers = for name, compiler of require "./compilers"
    new compiler(exports.options)


exports.createBuildDirectories = (buildPath) ->
  createDir = (dirPath) ->
    fileUtil.mkdirsSync path.join(buildPath, dirPath), 0755
  createDir "web/js"
  createDir "web/css"


# Dispatcher for file watching which determines which action needs to be done
# according to the file that was changed/created/removed.
exports.dispatch = (file) ->
  for compiler in compilers when compiler.matchesFile file
    return compiler.onFileChanged file, ->
      testrunner.run(exports.options)
