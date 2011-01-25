# brunch can be used via command-line tool or manually by calling run(settings).

root = __dirname + "/../"
# External dependencies.
util      = require 'util'
fs        = require 'fs'
path      = require 'path'
watcher   = require 'watch'
spawn     = require('child_process').spawn
_         = require 'underscore'

# the current brunch version number
exports.VERSION = '0.0.3'

exports.run = (settings) ->
  exports.settings = settings
  if exports.settings.watch
    exports.watch()

# project skeleton generator
# * create directory strucutre
# * create main.coffee bootstrapping file
# TODO: create index.html and decide where to put it
exports.newProject = ->
  directory_layout = ["",
                      "app",
                      "config",
                      "controllers",
                      "lib",
                      "models",
                      "templates",
                      "vendor",
                      "views",
                      "stylesheets"]

  for directory in directory_layout
    fs.mkdirSync("brunch/#{directory}", 0755)

  # create main.coffee app file
  app_name = 'br'
  main_content = """
                 window.#{app_name} = {}
                 #{app_name}.controllers = {}
                 #{app_name}.models = {}
                 #{app_name}.views = {}
                 #{app_name}.app = {}

                 # app bootstrapping on document ready
                 $(document).ready ->
                   if window.location.hash == ''
                     window.location.hash = 'home'
                   Backbone.history.start()
                 """
  fs.writeFileSync("brunch/app/main.coffee", main_content)

  console.log("created brunch directory layout")

# file watcher
exports.watch = ->
  watcher.createMonitor(exports.settings.input_dir, {interval: 10}, (monitor) ->
    monitor.on("changed", (file) ->
      exports.dispatch(file)
    )
    monitor.on("created", (file) ->
      exports.dispatch(file)
    )
    monitor.on("removed", (file) ->
      exports.dispatch(file)
    )
  )

# dispatcher for file watching which determines which action needs to be done
# according to the file that was changed/created/removed
exports.dispatch = (file) ->
  console.log('file: ' + file)

  if file.match(/coffee$/)
    execute_coffee = spawn('coffee', ['--lint', '--output', exports.settings.output_dir, exports.settings.input_dir])
    execute_coffee.stderr.on('data', (data) ->
      util.log(data)
    )
    execute_coffee.on('exit', (code) ->
      if code == 0
        util.log('compiled .coffee to .js')
      else
        util.log('there was a problem during .coffee to .js compilation. see above')
    )

  if file.match(/html$/) or file.match(/jst$/)
    execute_fusion = spawn('fusion', ['--output', exports.settings.output_dir, exports.settings.input_dir])
    execute_fusion.stdout.on('data', (data) ->
      util.log(data)
    )

  #if file.match(/sass$/)
  #  #compass watch --config brunch/config/compass.rb brunch/config/
  #  execute_compass = spawn('compass', ['-lh', '/usr'])
  #  execute_compass.stdout.on('data', (data) ->
  #    console.log('compiling .sass to .css:\n' + data)
  #  )
