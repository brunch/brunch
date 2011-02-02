# External dependencies.
fs          = require 'fs'
yaml        = require 'yaml'
brunch      = require './brunch'
optparse    = require './optparse'

# The list of all the valid option flags that 'brunch' knows how to handle.
SWITCHES = [
  ['-v', '--version',                     'display brunch version']
  ['-h', '--help',                        'display this help message']
  ['-p', '--projectTemplate [type]',      'set which kind of project template should be used']
]

# The help banner which is printed if brunch command-line tool is called with '--help' option.
BANNER = '''
  Usage: brunch [options] [command]

  Possible commands are:
    new           create new brunch project
    build         build project
    watch         watch brunch directory and rebuild if something changed
         '''
options = {}

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
  command = opts.arguments[0]
  if command is "new"
    return usage() unless opts.arguments[1]
    brunch.newProject opts.arguments[1], options
    return brunch.build options
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

# Run optparser which was taken from Coffeescript 1.0.0
parseOptions = ->
  optionParser  = new optparse.OptionParser SWITCHES, BANNER
  optionParser.parse process.argv.slice 2

# Print the '--help' usage message and exit.
usage = ->
  process.stdout.write (new optparse.OptionParser SWITCHES, BANNER).help()
  process.exit 0

# Print the '--version' message and exit.
version = ->
  process.stdout.write "brunch version #{brunch.VERSION}\n"
  process.exit 0
