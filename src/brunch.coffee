# brunch can be used via command-line tool or manually by calling run(options).

root = __dirname + "/../"
# External dependencies.
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
      helpers.recursiveCopy path.join(templatePath, 'build/'), exports.options.buildPath, ->
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
