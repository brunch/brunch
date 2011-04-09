# brunch can be used via command-line tool or manually by calling run(options).

root = __dirname + "/../"
# External dependencies.
fs        = require 'fs'
path      = require 'path'
spawn     = require('child_process').spawn
helpers   = require './helpers'
fileUtil  = require 'file'
colors    = require('../vendor/termcolors').colors
stitch    = require 'stitch'

# the current brunch version number
exports.VERSION = '0.6.2'

# server process storred as global for stop method
expressProcess = {}

# stitch package
package = {}

# are used as workaround to not call compile to often
# TODO in future this issues should be handled by a clean dir/file watcher
timeouts = {}

# project skeleton generator
exports.new = (options, callback) ->
  exports.options = options

  projectTemplatePath = path.join(module.id, "/../../template", exports.options.projectTemplate)

  path.exists exports.options.brunchPath, (exists) ->
    if exists
      helpers.log colors.lred("brunch:   directory already exists - can't create a project in there\n", true)
      process.exit 0

    fileUtil.mkdirsSync exports.options.brunchPath, 0755
    helpers.recursiveCopy path.join(projectTemplatePath, 'src/'), path.join(exports.options.brunchPath, 'src'), ->
      helpers.recursiveCopy path.join(projectTemplatePath, 'build/'), exports.options.buildPath, ->

      if(exports.options.projectTemplate is "express")
        helpers.recursiveCopy path.join(projectTemplatePath, 'server/'), path.join(exports.options.brunchPath, 'server'), ->
          callback()
      else
        callback()

      # TODO inform user which template was used and give futher instructions how to use brunch
      helpers.log colors.lgreen("brunch: created brunch directory layout\n", true)

# file watcher
exports.watch  = (options) ->
  exports.options = options
  exports.initializePackage(exports.options.brunchPath)

  # run node server if server file exists
  path.exists path.join(exports.options.brunchPath, 'server/main.js'), (exists) ->
    if exists
      helpers.log "express:  application started on port #{colors.blue(exports.options.expressPort, true)}: http://0.0.0.0:#{exports.options.expressPort}\n"
      expressProcess = spawn('node', [
        path.join(exports.options.brunchPath, 'server/main.js'),
        exports.options.expressPort,
        exports.options.brunchPath
      ])
      expressProcess.stderr.on 'data', (data) ->
        helpers.log colors.lred('express err: ' + data)

  # let's watch
  helpers.watchDirectory(path: path.join(exports.options.brunchPath, 'src'), callOnAdd: true, (file) ->
    exports.dispatch(file)
  )

# building all files
exports.build = (options) ->
  exports.options = options
  exports.initializePackage(exports.options.brunchPath)

  exports.compilePackage()
  exports.spawnStylus()

exports.stop = ->
  expressProcess.kill 'SIGHUP' unless expressProcess is {}

# creates a stitch package for app directory and include vendor as dependencies
exports.initializePackage = (brunchPath) ->
  vendorPath = path.join brunchPath, 'src/vendor'
  package = stitch.createPackage(
    # TODO get all dependencies and apply to the list
    dependencies: [
      path.join(vendorPath, 'ConsoleDummy.js'),
      path.join(vendorPath, 'jquery-1.5.2.js'),
      path.join(vendorPath, 'underscore-1.1.5.js'),
      path.join(vendorPath, 'backbone-0.3.3.js')
    ]
    paths: [path.join(brunchPath, 'src/app/')]
  )
  package

# dispatcher for file watching which determines which action needs to be done
# according to the file that was changed/created/removed
exports.dispatch = (file, options) ->

  queueCoffee = (func) ->
    clearTimeout(timeouts.coffee)
    timeouts.coffee = setTimeout(func, 100)

  # handle coffee changes
  if file.match(/\.coffee$/)
    queueCoffee ->
      exports.compilePackage()

  # handle template changes
  templateExtensionRegex = new RegExp("#{exports.options.templateExtension}$")
  if file.match(templateExtensionRegex)
    exports.compilePackage()

  if file.match(/src\/.*\.js$/)
    exports.compilePackage()

  if file.match(/\.styl$/)
    exports.spawnStylus()

# compile app files
#
# uses stitch compile method to merge all application files (including templates)
# and the defined dependencies to one single file
# each file will be saved into a module
exports.compilePackage = ->
  package.compile( (err, source) ->
    console.log colors.lred(err, true) if err

    fs.writeFile(path.join(exports.options.buildPath, 'web/js/app.js'), source, (err) ->
      console.log colors.lred(err, true) if err
      helpers.log "stitch:   #{colors.green('compiled', true)} application\n"
    )
  )

# spawn a new stylus process which compiles main.styl
exports.spawnStylus = ->

  path.join(exports.options.brunchPath, 'src')
  executeStylus = spawn('stylus', [
    '--compress',
    '--out',
    path.join(exports.options.buildPath, 'web/css'),
    path.join(exports.options.brunchPath, 'src/app/styles/main.styl')
  ])
  executeStylus.stdout.on 'data', (data) ->
    helpers.log 'stylus: ' + data
  executeStylus.stderr.on 'data', (data) ->
    helpers.log colors.lred('stylus err: ' + data)
