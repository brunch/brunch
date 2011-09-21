# External dependencies.
parser = require "nomnom"
path = require "path"
fs = require "fs"
_  = require "underscore"

brunch = require "./brunch"
dsl = require './dsl'
helpers = require "./helpers"

# The list of all the valid option flags
globalOpts =
  version:
    abbr: "v"
    flag: true
    help: "display brunch version"
    callback: -> version()
  output:
    abbr: "o"
    help: "set build path"
    metavar: "DIRECTORY"
  minify:
    abbr: "m"
    flag: true
    help: "minify the app.js output via UglifyJS"

# The help banner which is printed if brunch command-line tool is called with "--help" option.
banner = """
  http://brunchwithcoffee.com

  Usage: brunch [command] [options]

  Possible commands are:
    new [<path>]    create new brunch project
    build [<path>]  build project
    watch [<path>]  watch brunch directory and rebuild if something changed
         """

options = {}

# Run "brunch" by parsing passed options and determining what action to take.
# This also includes checking for a config file. Options in commandline arguments
# overwrite options from the config file. In this case you are able to have
# reasonable defaults and changed only the options you need to change in this particular case.
exports.run = ->
  parser.globalOpts globalOpts
  parser.scriptName "brunch <command> [<path>]"
  parser.printFunc usage

  # create new brunch app and build it after all files were copied
  parser.command("new").callback((opts) ->
    rootPath = exports.generateRootPath opts[1]
    brunch.new rootPath, ->
      options = exports.loadConfigFile rootPath
      brunch.build rootPath, options
  ).help("Create new brunch project")

  parser.command("build").callback((opts) ->
    rootPath = exports.generateRootPath opts[1]
    options = exports.loadConfigFile rootPath
    brunch.build rootPath, options
  ).help("Build a brunch project")

  parser.command("watch").callback((opts) ->
    rootPath = exports.generateRootPath opts[1]
    options = exports.loadConfigFile rootPath
    brunch.watch rootPath, options
  ).help("Watch brunch directory and rebuild if something changed")

  parser.parseArgs()
  return usage() unless process.argv[2]

exports.generateRootPath = (appPath) ->
  if appPath? then appPath else './'

# Load options from config file
exports.loadConfigFile = (rootPath) ->
  options = null
  coffee_config = path.join(rootPath, 'config.coffee')
  yaml_config = path.join(rootPath, 'config.yaml')
  if path.existsSync coffee_config
    options = dsl.loadConfigFile coffee_config
  else if path.existsSync yaml_config
    options = dsl.loadYamlConfigFile yaml_config
  else
    helpers.logError "[Brunch]: couldn't find config file"
    helpers.exit()
  options

# Print the "--help" usage message and exit.
usage = ->
  process.stdout.write banner
  process.stdout.write helpers.optionsInfo globalOpts
  helpers.exit()

# Print the "--version" message and exit.
version = ->
  process.stdout.write "brunch version #{brunch.VERSION}\n"
  helpers.exit()
