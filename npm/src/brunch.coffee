# brunch can be used via command-line tool or manually by calling run(options).

root = __dirname + "/../"
# External dependencies.
util      = require 'util'
fs        = require 'fs'
path      = require 'path'
spawn     = require('child_process').spawn
glob      = require 'glob'
brunch    = require 'brunch'
helpers   = require './helpers'

# the current brunch version number
exports.VERSION = '0.2.9'

# project skeleton generator
# * create directory strucutre
# * create main.coffee bootstrapping file
exports.new = (projectName, options) ->
  exports.options = options

  projectTemplatePath = path.join(module.id, "/../../template", exports.options.projectTemplate)

  fs.mkdirSync "brunch", 0755
  helpers.copy path.join(projectTemplatePath, 'src/'), 'brunch/src'
  helpers.copy path.join(projectTemplatePath, 'build/'), 'brunch/build'
  helpers.copy path.join(projectTemplatePath, 'config/'), 'brunch/config'

  if(exports.options.projectTemplate is "express")
    helpers.copy path.join(projectTemplatePath, 'server/'), 'brunch/server'

  # TODO inform user which template was used and give futher instructions how to use brunch
  util.log "Brunch:     created brunch directory layout"

# file watcher
exports.watch  = (options) ->
  exports.options = options

  # run node server if projectTemplate is express
  if(exports.options.projectTemplate is "express")
    executeServer = spawn 'node', ['brunch/server/main.js']

  # let's watch
  helpers.watchDirectory(path: 'brunch', callOnAdd: true, (file) ->
    exports.dispatch(file)
  )

# building all files
exports.build = ->
  sourcePaths = exports.generateSourcePaths()
  exports.spawnCoffee(sourcePaths)
  exports.spawnDocco(sourcePaths)
  exports.spawnFusion()
  exports.spawnStylus()
  exports.copyJsFiles()

# dispatcher for file watching which determines which action needs to be done
# according to the file that was changed/created/removed
exports.dispatch = (file) ->

  # handle coffee changes
  if file.match(/coffee$/)
    sourcePaths = exports.generateSourcePaths()

    exports.spawnCoffee(sourcePaths)
    exports.spawnDocco(sourcePaths)

  # handle template changes
  templateExtensionRegex = new RegExp("#{exports.options.templateExtension}$")
  if file.match(templateExtensionRegex)
    exports.spawnFusion()

  if file.match(/styl$/)
    exports.spawnStylus()

  if file.match(/^brunch\/src\/.*js$/)
    exports.copyJsFile(file)

# generate a list of paths containing all coffee files
exports.generateSourcePaths = ->
  appSources = ['brunch/src/app/helpers/*.coffee',
    'brunch/src/app/models/*.coffee',
    'brunch/src/app/collections/*.coffee',
    'brunch/src/app/controllers/*.coffee',
    'brunch/src/app/views/*.coffee']
  sourcePaths = []
  for appSource in appSources
    globbedPaths = glob.globSync(appSource, 0)
    sourcePaths = sourcePaths.concat(globbedPaths)
  sourcePaths.unshift('brunch/src/app/main.coffee')
  sourcePaths

# spawns a new coffee process which merges all *.coffee files into on js file
exports.spawnCoffee = (sourcePaths) ->
  coffeeParams = ['--output',
    'brunch/build/web/js',
    '--join',
    '--lint',
    '--compile']
  coffeeParams = coffeeParams.concat(sourcePaths)

  executeCoffee = spawn 'coffee', coffeeParams
  executeCoffee.stdout.on 'data', (data) ->
    util.log 'Coffee:  ' + data
  executeCoffee.stderr.on 'data', (data) ->
    util.log 'Coffee err: ' + data
  executeCoffee.on 'exit', (code) ->
    if code == 0
      util.log('Coffee: compiled .coffee to .js\n')
    else
      util.log('Coffee err: There was a problem during .coffee to .js compilation. see above')

# spawns a new docco process which generates documentation
exports.spawnDocco = (sourcePaths) ->
  executeDocco = spawn('docco', sourcePaths)
  executeDocco.stdout.on 'data', (data) ->
    util.log 'Docco:  ' + data
  executeDocco.stderr.on 'data', (data) ->
    util.log 'Docco err:  ' + data

# spawns a new fusion compiling which merges all the templates into one namespace
exports.spawnFusion = ->
  executeFusion = spawn 'fusion', ['--config', 'brunch/config/fusion/options.yaml','brunch/src/app/templates']
  executeFusion.stdout.on 'data', (data) ->
    util.log 'Fusion: ' + data
  executeFusion.stderr.on 'data', (data) ->
    util.log 'Fusion err: ' + data

# spawn a new stylus process which compiles main.styl
exports.spawnStylus = ->
  executeStylus = spawn('stylus', ['--compress', '--out', 'brunch/build/web/css', 'brunch/src/app/styles/main.styl'])
  executeStylus.stdout.on 'data', (data) ->
    util.log 'Stylus: ' + data
  executeStylus.stderr.on 'data', (data) ->
    util.log 'Stylus err: ' + data

# copy one single js file to build directory
exports.copyJsFile = (file) ->
  newLocation = file.replace('brunch/src', 'brunch/build/web/js')
  helpers.mkdirsForFile(newLocation, 0755)
  helpers.copy file, newLocation

# copy all js files from src to build
exports.copyJsFiles = ->
  helpers.getFilesInTree 'brunch/src', (err, files) ->
    util.log err if err
    for file in files
      exports.copyJsFile file
    util.log('Brunch: copied .js files to build folder\n')
