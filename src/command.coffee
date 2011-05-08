# External dependencies.
nomnom      = require 'nomnom'
path        = require 'path'
brunch      = require './brunch'
helpers     = require './helpers'
colors      = require('../vendor/termcolors').colors
yaml        = require 'yaml'
fs          = require 'fs'
_           = require 'underscore'

# The list of all the valid option flags that 'brunch' knows how to handle.
NOMNOM_CONFIG = [
    name  : 'expressPort'
    string: '-ep <port>, --expressPort=<port>'
    help  : 'set the express server port'
  ,
    name  : 'projectTemplate'
    string: '-p <template>, --projectTemplate=<template>'
    help  : 'set which kind of project template should be used'
  ,
    name  : 'version'
    string: '-v, --version'
    help  : 'display brunch version'
  ,
    name  : 'help'
    string: '-h, --help'
    help  : 'display brunch help'
  ,
    name  : 'output'
    string: '-o, --output'
    help  : 'set build path'
]

# The help banner which is printed if brunch command-line tool is called with '--help' option.
BANNER = '''
  Usage: brunch [command] [options]

  Possible commands are:
    new [<path>]    create new brunch project
    build [<path>]  build project
    watch [<path>]  watch brunch directory and rebuild if something changed
         '''

options = {}
argParser = {}

# Run 'brunch' by parsing passed options and determining what action to take.
# This also includes checking for a config file. Options in commandline arguments
# overwrite options from the config file. In this case you are able to have
# reasonable defaults and changed only the options you need to change in this particular case.
exports.run = ->
  opts = parseOptions()
  return usage() if opts.help
  return version() if opts.version

  # migration information
  helpers.log "brunch:   #{colors.lblue('Backwards Incompatible Changes since 0.7.0', true)}\n\n

                     please visit http://brunchwithcoffee.com/#migrate-to-0-7-0-plus for more information \n\n"

  options = exports.loadDefaultArguments()
  command = opts[0]
  configPath = if opts[1]? then path.join(opts[1], 'config.yaml') else 'brunch/config.yaml'

  # create new brunch app and build it after all files were copied
  if command is "new"
    options = exports.loadOptionsFromArguments opts, options
    brunch.new options, ->
      options = _.extend(options, exports.loadConfigFile(configPath) )
      options = exports.loadOptionsFromArguments opts, options
      brunch.build options

  else if command is 'watch' or command is 'build'
    options = _.extend(options, exports.loadConfigFile(configPath) )
    options = exports.loadOptionsFromArguments opts, options

    if command is "watch"
      return brunch.watch options
    else if command is "build"
      return brunch.build options

  else
    usage()

# Load default options
exports.loadDefaultArguments = ->
  options =
    templateExtension: 'eco'
    projectTemplate: 'express'
    expressPort: '8080'
    brunchPath: 'brunch'
    buildPath: 'brunch/build'
    dependencies: []
  options

# Load options from config file
exports.loadConfigFile = (configPath) ->
  try
    options = yaml.eval fs.readFileSync(configPath, 'utf8')
    return options
  catch e
    helpers.log colors.lred("brunch:   Couldn't find config.yaml file\n", true)
    process.exit 0

# Load options from arguments
exports.loadOptionsFromArguments = (opts, options) ->
  options.templateExtension = opts.templateExtension if opts.templateExtension?
  options.projectTemplate = opts.projectTemplate if opts.projectTemplate?
  options.expressPort = opts.expressPort if opts.expressPort?
  options.brunchPath = opts[1] if opts[1]?
  if opts.buildPath?
    options.buildPath = opts.buildPath
  else unless options.buildPath?
    options.buildPath = path.join options.brunchPath, 'build'
  options

# Run nomnom to parse the arguments
parseOptions = ->
  nomnom.parseArgs NOMNOM_CONFIG, { printHelp: false }

# Print the '--help' usage message and exit.
usage = ->
  process.stdout.write BANNER
  process.stdout.write helpers.optionsInfo(NOMNOM_CONFIG)
  process.exit 0

# Print the '--version' message and exit.
version = ->
  process.stdout.write "brunch version #{brunch.VERSION}\n"
  process.exit 0
