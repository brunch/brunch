# External dependencies.
fs          = require 'fs'
yaml        = require 'yaml'
nomnom      = require 'nomnom'
brunch      = require './brunch'
helpers   = require './helpers'

# The list of all the valid option flags that 'brunch' knows how to handle.
NOMNOM_CONFIG = [
    name  : 'projectTemplate',
    string: '-p <template>, --projectTemplate=<template>',
    help  : 'set which kind of project template should be used'
  ,
    name  : 'version',
    string: '-v, --version',
    help  : 'display brunch version'
  ,
    name  : 'help',
    string: '-h, --help',
    help  : 'display brunch help'
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
  options.templateExtension = "eco"
  options.projectTemplate = "express"
  options = exports.loadOptionsFromArguments opts, options
  command = opts[0]
  if command is "new"
    name = opts[1] || "app"
    brunch.new name, options, ->
      brunch.build options
  else if command is "watch"
    return brunch.watch options
  else if command is "build"
    return brunch.build options
  else
    usage()

# Load settings from arguments.
exports.loadOptionsFromArguments = (opts, options) ->
  options.templateExtension = opts.templateExtension if opts.templateExtension
  options.projectTemplate = opts.projectTemplate if opts.projectTemplate
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
