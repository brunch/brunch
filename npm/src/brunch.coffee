# brunch can be used via command-line tool or manually by calling run(settings).

root = __dirname + "/../"
# External dependencies.
util      = require 'util'
fs        = require 'fs'
path      = require 'path'
watcher   = require 'watch'
spawn     = require('child_process').spawn
_         = require 'underscore'

#abs_root = path.resolve(root)
#console.log(abs_root)

# the current brunch version number
exports.VERSION = '0.0.7'

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
                      "build",
                      "build/web",
                      "src",
                      "src/app",
                      "src/config",
                      "src/controllers",
                      "src/lib",
                      "src/models",
                      "src/templates",
                      "src/vendor",
                      "src/views",
                      "src/stylesheets"]

  for directory in directory_layout
    fs.mkdirSync("brunch/#{directory}", 0755)

  # create main.coffee app file
  main_content = """
                 window.#{projectName} = {}
                 #{projectName}.controllers = {}
                 #{projectName}.models = {}
                 #{projectName}.views = {}
                 #{projectName}.app = {}

                 # app bootstrapping on document ready
                 $(document).ready ->
                   if window.location.hash == ''
                     window.location.hash = 'home'
                   Backbone.history.start()
                 """
  fs.writeFileSync("brunch/src/app/main.coffee", main_content)

  # create compass.rb config file for compass
  compass_content = """
                    sass_dir = "../src/stylesheets"
                    http_path = "/static/"

                    css_dir = "css"
                    images_dir = "img"
                    javascripts_dir = "js"
                    """
  fs.writeFileSync("brunch/src/config/compass.rb", main_content)

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
    execute_coffee = spawn('coffee', ['--lint', '--output', exports.settings.output_dir + 'web', exports.settings.input_dir])
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
    console.log('fusion')
    execute_fusion = spawn('fusion', ['--output', exports.settings.output_dir + 'web/app/templates.js', exports.settings.input_dir + 'templates'])
    execute_fusion.stdout.on('data', (data) ->
      util.log(data)
    )

  if file.match(/sass$/)
    execute_compass = spawn('compass', ['--config', 'brunch/config/compass.rb', 'src/stylesheets'])
    execute_compass.stdout.on('data', (data) ->
      console.log('compiling .sass to .css:\n' + data)
    )
