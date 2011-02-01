# brunch can be used via command-line tool or manually by calling run(settings).

root = __dirname + "/../"
# External dependencies.
util      = require 'util'
fs        = require 'fs'
path      = require 'path'
spawn     = require('child_process').spawn
_         = require 'underscore'
glob      = require 'glob'

# the current brunch version number
exports.VERSION = '0.2.3'

exports.run = (settings) ->
  exports.settings = settings
  if exports.settings.watch
    exports.watch()

# project skeleton generator
# * create directory strucutre
# * create main.coffee bootstrapping file
# TODO: create index.html and decide where to put it
exports.newProject = (projectName) ->

  directory_layout = ["",
                      "config",
                      "config/fusion",
                      "build",
                      "build/web",
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

  for directory in directory_layout
    fs.mkdirSync("brunch/#{directory}", 0755)

  # create main.coffee app file
  main_content = """
                 window.#{projectName} = {}
                 #{projectName}.controllers = {}
                 #{projectName}.models = {}
                 #{projectName}.views = {}

                 # app bootstrapping on document ready
                 $(document).ready ->
                   Backbone.history.saveLocation("!/home") if '' == Backbone.history.getFragment()
                   Backbone.history.start()
                 """
  fs.writeFileSync("brunch/src/app/main.coffee", main_content)

  # create fusion config and eco hook files
  fusion_config = """
                  hook: "brunch/config/fusion/hook.js"
                  """
  fs.writeFileSync("brunch/config/fusion/settings.yaml", fusion_config)

  # create fusion config and eco hook files
  fusion_hook = """
                var eco = require('eco');
                exports.compileTemplate = function(content) {
                  return eco.compile(content);
                };
                """
  fs.writeFileSync("brunch/config/fusion/hook.js", fusion_hook)

  console.log("created brunch directory layout")

# file watcher
exports.watch = ->
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
  console.log('file: ' + file)

  # handle coffee changes
  if file.match(/coffee$/)
    app_sources = ['brunch/src/app/helpers/*.coffee',
      'brunch/src/app/models/*.coffee',
      'brunch/src/app/collections/*.coffee',
      'brunch/src/app/controllers/*.coffee',
      'brunch/src/app/views/*.coffee']
    source_paths = []
    for app_source in app_sources
      globbedPaths = glob.globSync(app_source, 0)
      source_paths = source_paths.concat(globbedPaths)

    source_paths.push('brunch/src/app/main.coffee')

    coffeeParams = ['--output',
      'brunch/build/web/js',
      '--join',
      '--lint',
      '--compile']
    coffeeParams = coffeeParams.concat(source_paths)

    execute_coffee = spawn('coffee', coffeeParams)
    execute_coffee.stderr.on('data', (data) ->
      util.log(data)
    )
    execute_coffee.on('exit', (code) ->
      if code == 0
        util.log('compiled .coffee to .js')
      else
        util.log('there was a problem during .coffee to .js compilation. see above')
    )

    globbedPaths = glob.globSync('brunch/src/app/*.coffee', 0)
    executeDocco = spawn('docco', globbedPaths)
    executeDocco.stderr.on('data', (data) ->
      util.log(data)
    )


  # handle template changes
  if file.match(/html$/) or file.match(/jst$/)
    console.log('fusion')
    execute_fusion = spawn('fusion', ['--hook', 'brunch/config/fusion/hook.js', '--output', 'brunch/build/web/js/templates.js', 'brunch/src/app/templates'])
    execute_fusion.stdout.on('data', (data) ->
      util.log(data)
    )

  if file.match(/style$/)
    console.log('style')
    execute_stylus = spawn('stylus', ['--compress', '<', 'brunch/src/app/styles/main.style', '>', 'brunch/build/web/css/main.css'])
    execute_stylus.stdout.on('data', (data) ->
      util.log('compiling .style to .css:\n' + data)
    )
