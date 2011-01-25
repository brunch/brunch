# External dependencies.
fs          = require 'fs'
yaml        = require 'yaml'
brunch      = require './brunch'
optparse    = require './optparse'

# The list of all the valid option flags that 'brunch' knows how to handle.
SWITCHES = [
  ['new', '--new',                        'create new brunch project']
  ['-v', '--version',                     'display brunch version']
  ['-h', '--help',                        'display this help message']
  ['-i', '--input [DIR]',                 'set input path of project']
  ['-o', '--output [DIR]',                'set output path of project']
  ['-c', '--config [FILE]',               'set path of settings file']
  ['-w', '--watch',                       'watch files (currently you have to restart if files are added or renamed)']
]

# The help banner which is printed if brunch command-line tool is called with '--help' option.
BANNER = '''
  Usage: brunch [options] [<directory>]
         '''
settings = {}

# Run 'brunch' by parsing passed options and determining what action to take.
# This also includes checking for a settings file. Settings in commandline arguments
# overwrite settings from the settings file. In this case you are able to have
# reasonable defaults and changed only the settings you need to change in this particular case.
exports.run = ->
  opts = parseOptions()
  return usage() if opts.help
  return version() if opts.version
  return newProject() if opts.new
  exports.loadSettingsFromFile(opts.config) if opts.config
  exports.loadSettingsFromArguments(opts)
  brunch.run(settings)

# Load settings from a settings file or at least set some
# reasonable defaults.
exports.loadSettingsFromFile = (settings_file) ->
  settings_file or= "settings.yaml"
  settings = yaml.eval fs.readFileSync settings_file, 'utf8'
  settings.namespace = "window" unless settings.namespace
  settings.templateExtension = "html" unless settings.templateExtension
  settings.input_dir = "." unless settings.input
  settings.output_dir = "../build" unless settings.output
  settings

# Load settings from arguments.
exports.loadSettingsFromArguments = (opts) ->
  settings.namespace = opts.namespace if opts.namespace
  settings.templateExtension = opts.templateExtension if opts.templateExtension
  settings.input_dir = opts.input if opts.input
  settings.output_dir = opts.output if opts.output
  settings.watch = opts.watch if opts.watch
  settings

# Run optparser which was taken from Coffeescript 1.0.0
parseOptions = ->
  optionParser  = new optparse.OptionParser SWITCHES, BANNER
  optionParser.parse process.argv.slice 2

# Print the '--help' usage message and exit.
usage = ->
  process.stdout.write((new optparse.OptionParser SWITCHES, BANNER).help())
  process.exit 0

# Print the '--version' message and exit.
version = ->
  process.stdout.write("brunch version #{brunch.VERSION}\n")
  process.exit 0

newProject = ->
  brunch.newProject()
