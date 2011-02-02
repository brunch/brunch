# brunch can be used via command-line tool or manually by calling run(options).

root = __dirname + "/../"
# External dependencies.
util      = require 'util'
fs        = require 'fs'
path      = require 'path'
spawn     = require('child_process').spawn
_         = require 'underscore'
glob      = require 'glob'
brunch    = require 'brunch'

# the current brunch version number
exports.VERSION = '0.2.3'

exports.run = (options) ->
  exports.options = options
  if exports.options.watch
    exports.watch()

# project skeleton generator
# * create directory strucutre
# * create main.coffee bootstrapping file
exports.newProject = (projectName, options) ->
  exports.options = options

  projectTemplatePath = path.join(module.id + "/../../template")

  # TODO use walk to automatically copy the project template!!!!
  directoryLayout = ["",
                      "config",
                      "config/fusion",
                      "build",
                      "build/web",
                      "build/web/css", # TODO workaroung until stylus creates it output dirs by itself
                      "src",
                      "src/app",
                      "src/app/controllers",
                      "src/app/helpers",
                      "src/app/models",
                      "src/app/styles",
                      "src/app/templates",
                      "src/app/views",
                      "src/lib",
                      "src/vendor"]

  # create directory layout
  for directory in directoryLayout
    fs.mkdirSync "brunch/#{directory}", 0755

  # copy files into new project
  fs.linkSync path.join(projectTemplatePath, "src/app/controllers/main_controller.coffee"), "brunch/src/app/controllers/main_controller.coffee"
  fs.linkSync path.join(projectTemplatePath, "src/app/views/home_view.coffee"), "brunch/src/app/views/home_view.coffee"
  fs.linkSync path.join(projectTemplatePath, "src/app/templates/home.eco"), "brunch/src/app/templates/home.eco"
  fs.linkSync path.join(projectTemplatePath, "src/app/main.coffee"), "brunch/src/app/main.coffee"
  fs.linkSync path.join(projectTemplatePath, "src/app/styles/main.styl"), "brunch/src/app/styles/main.styl"
  fs.linkSync path.join(projectTemplatePath, "src/app/styles/reset.styl"), "brunch/src/app/styles/reset.styl"
  fs.linkSync path.join(projectTemplatePath, "config/fusion/options.yaml"), "brunch/config/fusion/options.yaml"
  fs.linkSync path.join(projectTemplatePath, "config/fusion/hook.js"), "brunch/config/fusion/hook.js"
  fs.linkSync path.join(projectTemplatePath, "build/index.html"), "brunch/build/index.html"

  console.log "created brunch directory layout"

# file watcher
exports.watch  = ->
  ## copied source from watch_dir, because it did not work as package
  fs.watchDir = (_opts, callback) ->

    opts = _.extend(
      { path: '.', persistent: true, interval: 500, callOnAdd: false },
      _opts
    )

    watched = []

    addToWatch = (file) ->

      fs.realpath file, (err, filePath) ->

        callOnAdd = opts.callOnAdd

        unless _.include(watched, filePath)
          isDir = false
          watched.push filePath

          fs.watchFile filePath, { persistent: opts.persistent, interval: opts.interval }, (curr, prev) ->
            return if curr.mtime.getTime() is prev.mtime.getTime()

            if isDir
              addToWatch filePath
            else
              callback filePath

        else
          callOnAdd = false


        fs.stat filePath, (err, stats) ->
          if stats.isDirectory()
            isDir = true

            fs.readdir filePath, (err, files) ->
              process.nextTick () ->
                addToWatch filePath + '/' + file for file in files
          else
            callback filePath if callOnAdd


    addToWatch opts.path

  # let's watch
  fs.watchDir(path: 'brunch', callOnAdd: true, (file) ->
    exports.dispatch(file)
  )

# dispatcher for file watching which determines which action needs to be done
# according to the file that was changed/created/removed
exports.dispatch = (file) ->
  console.log 'file: ' + file

  # handle coffee changes
  if file.match(/coffee$/)
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

    coffeeParams = ['--output',
      'brunch/build/web/js',
      '--join',
      '--lint',
      '--compile']
    coffeeParams = coffeeParams.concat(sourcePaths)

    executeCoffee = spawn 'coffee', coffeeParams
    executeCoffee.stderr.on 'data', (data) ->
      util.log(data)

    executeCoffee.on 'exit', (code) ->
      if code == 0
        util.log('compiled .coffee to .js')
      else
        util.log('there was a problem during .coffee to .js compilation. see above')

    executeDocco = spawn('docco', sourcePaths)
    executeDocco.stderr.on 'data', (data) ->
      util.log(data)

  # handle template changes
  templateExtensionRegex = new RegExp("#{exports.options.templateExtension}$")
  if file.match(templateExtensionRegex)
    console.log('fusion')
    executeFusion = spawn 'fusion', ['--config', 'brunch/config/fusion/options.yaml','brunch/src/app/templates']
    executeFusion.stdout.on 'data', (data) ->
      util.log data

  if file.match(/styl$/)
    console.log 'stylesheets'
    executeStylus = spawn('stylus', ['--compress', '--out', 'brunch/build/web/css', 'brunch/src/app/styles/main.styl'])
    executeStylus.stdout.on 'data', (data) ->
      util.log('compiling .style to .css:\n' + data)
