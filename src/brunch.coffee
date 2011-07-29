# brunch can be used via command-line tool or manually by calling run(options).

root = __dirname + "/../"
# External dependencies.
fs        = require 'fs'
path      = require 'path'
helpers   = require './helpers'
fileUtil  = require 'file'
colors    = require('../vendor/termcolors').colors

# the current brunch version number
exports.VERSION = require('./package').version

# available compilers
compilers = []

# project skeleton generator
exports.new = (options, callback) ->
  exports.options = options

  templatePath = path.join(module.id, "/../../template/base")

  path.exists exports.options.brunchPath, (exists) ->
    if exists
      helpers.log colors.lred("brunch:   directory already exists - can't create a project in there\n", true)
      process.exit 0

    fileUtil.mkdirsSync exports.options.brunchPath, 0755
    fileUtil.mkdirsSync exports.options.buildPath, 0755

    helpers.recursiveCopy templatePath, exports.options.brunchPath, ->
      exports.createExampleIndex path.join(exports.options.brunchPath, 'index.html'), exports.options.buildPath
      callback()
      helpers.log "brunch:   #{colors.green('created ', true)} brunch directory layout\n"

# file watcher
exports.watch  = (options) ->
  exports.options = options
  exports.createBuildDirectories(exports.options.buildPath)
  exports.initializeCompilers()

  # let's watch
  helpers.watchDirectory(path: path.join(exports.options.brunchPath, 'src'), callOnAdd: true, (file) ->
    exports.dispatch(file)
  )

# building all files
exports.build = (options) ->
  exports.options = options
  exports.createBuildDirectories(exports.options.buildPath)
  exports.initializeCompilers()

  for compiler in compilers
    compiler.compile(['.'])

# creates an example index.html for brunch with the correct relative path to the build directory
exports.createExampleIndex = (filePath, buildPath) ->

  # fixing relativ path
  brunchPath = path.join exports.options.brunchPath, '/'
  if buildPath.indexOf(brunchPath) == 0
    relativePath = buildPath.substr brunchPath.length
  else
    relativePath = path.join '..', buildPath

  index = "<!doctype html>\n
<html lang=\"en\">\n
<head>\n
  <meta charset=\"utf-8\">\n
  <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge,chrome=1\">\n
  <link rel=\"stylesheet\" href=\"#{ path.join(relativePath, 'web/css/main.css') }\" type=\"text/css\" media=\"screen\">\n
  <script src=\"#{ path.join(relativePath, 'web/js/app.js') }\"></script>\n
  <script>require('main');</script>\n
</head>\n
<body>\n
</body>"
  fs.writeFileSync(filePath, index)

# initializes all avaliable compilers
exports.initializeCompilers = ->
  compilers = (new compiler(exports.options) for name, compiler of require('./compilers'))

exports.createBuildDirectories = (buildPath) ->
  fileUtil.mkdirsSync path.join(buildPath, 'web/js'), 0755
  fileUtil.mkdirsSync path.join(buildPath, 'web/css'), 0755

# dispatcher for file watching which determines which action needs to be done
# according to the file that was changed/created/removed
exports.dispatch = (file) ->
  for compiler in compilers
    if compiler.matchesFile(file)
      compiler.fileChanged(file)
      break
