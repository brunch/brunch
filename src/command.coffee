# External dependencies.
parser = require "nomnom"
path = require "path"
yaml = require "yaml"
fs = require "fs"
_  = require "underscore"

brunch = require "./brunch"
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
  options = exports.loadDefaultArguments()

  parser.globalOpts globalOpts
  parser.scriptName "brunch <command> [<path>]"
  parser.printFunc usage

  # create new brunch app and build it after all files were copied
  parser.command("new").callback((opts) ->
    options = exports.loadOptionsFromArguments opts, options
    brunch.new options, ->
      configPath = exports.generateConfigPath opts[1]
      options = _.extend options, exports.loadConfigFile(configPath)
      options = exports.loadOptionsFromArguments opts, options
      brunch.build options
  ).help("Create new brunch project")

  parser.command("build").callback((opts) ->
    configPath = exports.generateConfigPath opts[1]
    options = _.extend(options, exports.loadConfigFile(configPath))
    options = exports.loadOptionsFromArguments opts, options
    brunch.build options
  ).help("Build a brunch project")

  parser.command("watch").callback((opts) ->
    configPath = exports.generateConfigPath opts[1]
    options = _.extend(options, exports.loadConfigFile(configPath))
    options = exports.loadOptionsFromArguments opts, options
    brunch.watch options
  ).help("Watch brunch directory and rebuild if something changed")

  parser.parseArgs()


exports.generateConfigPath = (appPath) ->
  if appPath? then path.join(appPath, "config.yaml") else "brunch/config.yaml"


# Load default options
exports.loadDefaultArguments = ->
  # buildPath is created in loadOptionsFromArguments
  options =
    templateExtension: "eco"
    brunchPath: "brunch"
    dependencies: []
    minify: false
  options


# Load options from config file
exports.loadConfigFile = (configPath) ->
  try
    options = yaml.eval fs.readFileSync configPath, "utf8"
  catch error
    helpers.logError "[Brunch]: couldn't find config.yaml file"
    helpers.exit()
  options


# Load options from arguments
exports.loadOptionsFromArguments = (opts, options) ->
  options.templateExtension = opts.templateExtension if opts.templateExtension?
  options.brunchPath = opts[1] if opts[1]?
  options.minify = opts.minify if opts.minify?
  if opts.output?
    options.buildPath = opts.output
  else unless options.buildPath?
    options.buildPath = path.join options.brunchPath, "build"
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
