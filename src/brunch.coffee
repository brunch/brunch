# brunch can be used via command-line tool or manually by calling run(options).

root = __dirname + "/../"
# External dependencies.
fs        = require 'fs'
path      = require 'path'
spawn     = require('child_process').spawn
helpers   = require './helpers'
colors    = require('../vendor/termcolors').colors
stitch    = require 'stitch'

# the current brunch version number
exports.VERSION = '0.6.2'

# server process storred as global for stop method
expressProcess = {}

# are used as workaround to not call compile to often
# TODO in future this issues should be handled by a clean dir/file watcher
timeouts = {}

# creates a stitch package for app directory and include vendor as dependencies
vendorPath = 'brunch/src/vendor/'
package = stitch.createPackage(
  # TODO get all dependencies and apply to the list
  dependencies: [
    "#{vendorPath}ConsoleDummy.js",
    "#{vendorPath}jquery-1.5.2.js",
    "#{vendorPath}underscore-1.1.5.js",
    "#{vendorPath}backbone-0.3.3.js"
  ]
  paths: ['brunch/src/app/']
)

# project skeleton generator
exports.new = (options, callback) ->
  exports.options = options

  projectTemplatePath = path.join(module.id, "/../../template", exports.options.projectTemplate)

  path.exists 'brunch', (exists) ->
    if exists
      helpers.log colors.lred("brunch:   brunch directory already exists - can't create another project\n", true)
      process.exit 0
    fs.mkdirSync 'brunch', 0755
    helpers.copy path.join(projectTemplatePath, 'src/'), 'brunch/src'
    helpers.copy path.join(projectTemplatePath, 'build/'), 'brunch/build'
    helpers.copy path.join(projectTemplatePath, 'config/'), 'brunch/config'

    if(exports.options.projectTemplate is "express")
      helpers.copy path.join(projectTemplatePath, 'server/'), 'brunch/server'

    # TODO inform user which template was used and give futher instructions how to use brunch
    helpers.log colors.lgreen("brunch: created brunch directory layout\n", true)
    callback()

# file watcher
exports.watch  = (options) ->
  exports.options = options

  # run node server if server file exists
  path.exists 'brunch/server/main.js', (exists) ->
    if exists
      helpers.log "express:  application started on port #{colors.blue(exports.options.expressPort, true)}: http://0.0.0.0:#{exports.options.expressPort}\n"
      expressProcess = spawn 'node', ['brunch/server/main.js', exports.options.expressPort]
      expressProcess.stderr.on 'data', (data) ->
        helpers.log colors.lred('express err: ' + data)

  # let's watch
  helpers.watchDirectory(path: 'brunch/src', callOnAdd: true, (file) ->
    exports.dispatch(file)
  )

# building all files
exports.build = (options) ->
  exports.options = options

  exports.compilePackage()
  exports.spawnStylus()

exports.stop = ->
  # TODO check out SIGHUP signal
  expressProcess.kill 'SIGHUP' unless expressProcess is {}

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

  if file.match(/brunch\/src\/.*\.js$/)
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
    fs.writeFile('brunch/build/web/js/app.js', source, (err) ->
      console.log colors.lred(err, true) if err
      helpers.log "stitch:   #{colors.green('compiled', true)} application\n"
    )
  )

# spawn a new stylus process which compiles main.styl
exports.spawnStylus = ->
  executeStylus = spawn('stylus', ['--compress', '--out', 'brunch/build/web/css', 'brunch/src/app/styles/main.styl'])
  executeStylus.stdout.on 'data', (data) ->
    helpers.log 'stylus: ' + data
  executeStylus.stderr.on 'data', (data) ->
    helpers.log colors.lred('stylus err: ' + data)
