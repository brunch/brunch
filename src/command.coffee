# External dependencies.
nomnom      = require 'nomnom'
path        = require 'path'
brunch      = require './brunch'
helpers     = require './helpers'

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
    new           create new brunch project
    build         build project
    watch         watch brunch directory and rebuild if something changed
         '''

options = {}
argParser = {}

# Run 'brunch' by parsing passed options and determining what action to take.
# This also includes checking for a settings file. Settings in commandline arguments
# overwrite settings from the settings file. In this case you are able to have
# reasonable defaults and changed only the settings you need to change in this particular case.
exports.run = ->
  opts = parseOptions()
  return usage() if opts.help
  return version() if opts.version
  options = exports.loadDefaultArguments
  options = exports.loadOptionsFromArguments opts, options
  command = opts[0]
  if command is "new"
    brunch.new options, ->
      brunch.build options
  else if command is "watch"
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
  options

# Load settings from arguments
exports.loadOptionsFromArguments = (opts, options) ->
  options.templateExtension = opts.templateExtension if opts.templateExtension?
  options.projectTemplate = opts.projectTemplate if opts.projectTemplate?
  options.expressPort = opts.expressPort if opts.expressPort?
  options.brunchPath = opts[1] if opts[1]?
  if opts.buildPath?
    options.buildPath = opts.buildPath
  else
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
