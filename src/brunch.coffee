# brunch can be used via command-line tool or manually by calling run(options).

root = __dirname + "/../"
# External dependencies.
path      = require 'path'
spawn     = require('child_process').spawn
helpers   = require './helpers'
fileUtil  = require 'file'
colors    = require('../vendor/termcolors').colors

# the current brunch version number
exports.VERSION = require('./package').version

# server process storred as global for stop method
expressProcess = {}

# available compilers
compilers = []

# project skeleton generator
exports.new = (options, callback) ->
  exports.options = options

  projectTemplatePath = path.join(module.id, "/../../template", exports.options.projectTemplate)

  path.exists exports.options.brunchPath, (exists) ->
    if exists
      helpers.log colors.lred("brunch:   directory already exists - can't create a project in there\n", true)
      process.exit 0

    fileUtil.mkdirsSync exports.options.brunchPath, 0755
    fileUtil.mkdirsSync exports.options.buildPath, 0755

    helpers.recursiveCopy projectTemplatePath, exports.options.brunchPath, ->
      helpers.recursiveCopy path.join(projectTemplatePath, 'build/'), exports.options.buildPath, ->
        callback()
        helpers.log "brunch:   #{colors.green('created ', true)} brunch directory layout\n"

# file watcher
exports.watch  = (options) ->
  exports.options = options
  exports.createBuildDirectories(exports.options.buildPath)
  exports.initializeCompilers()

  # run node server if server file exists
  path.exists path.join(exports.options.brunchPath, 'server/main.js'), (exists) ->
    if exists
      helpers.log "express:  #{colors.green('started ', true)} application on port #{colors.blue(exports.options.expressPort, true)}: http://0.0.0.0:#{exports.options.expressPort}\n"
      expressProcess = spawn('node', [
        path.join(exports.options.brunchPath, 'server/main.js'),
        exports.options.expressPort,
        exports.options.brunchPath
      ])
      expressProcess.stderr.on 'data', (data) ->
        helpers.log "express:  #{colors.lred('stderr  ', true)} #{data}"
      expressProcess.stdout.on 'data', (data) ->
        helpers.log "express:  #{colors.green('stdout  ', true)} #{data}"

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

exports.stop = ->
  expressProcess.kill 'SIGHUP' unless expressProcess is {}

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
