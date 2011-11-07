path = require "path"
yaml = require "yaml"
fs = require "fs"

brunch = require "./brunch"
helpers = require "./helpers"


exports.generateConfigPath = generateConfigPath = (appPath) ->
  if appPath? then path.join appPath, "config.yaml" else "./config.yaml"


exports.loadConfig = loadConfig = (configPath) ->
  try
    options = yaml.eval fs.readFileSync configPath, "utf8"
  catch error
    helpers.logError "[Brunch]: couldn't find config.yaml file"
    helpers.exit()
  options


exports.parseOpts = parseOpts = (options) ->
  config = loadConfig generateConfigPath options.appPath
  helpers.extend options, config


config =
  commands:
    new:
      help: "Create new brunch project"
      opts:
        appPath:
          position: 1
          help: "application path"
          metavar: "APP_PATH"
          required: yes
        buildPath:
          abbr: "o"
          help: "build path"
          metavar: "DIRECTORY"
          full: "output"
        #mvc:
        #  help: "Set application framework"
        #  metavar: "FRAMEWORK"
        #  default: "backbone"
        #  choices: ["backbone", "batman"]
        #templates:
        #  help: "Set templates engine"
        #  metavar: "ENGINE"
        #  default: "eco"
        #  choices: ["eco", "jade", "haml"]
        #styles:
        #  help: "Set style engine"
        #  metavar: "ENGINE"
        #  default: "css"
        #  choices: ["css", "sass", "compass", "stylus"]  # "sass" == "compass"
        #tests:
        #  help: "Set testing framework"
        #  metavar: "FRAMEWORK"
        #  default: "jasmine"
        #  choices: ["jasmine", "nodeunit"]
      callback: (options) ->
        brunch.new options, ->
          brunch.build parseOpts options

    build:
      help: "Build a brunch project"
      opts:
        buildPath:
          abbr: "o"
          help: "build path"
          metavar: "DIRECTORY"
          full: "output"
        minify:
          abbr: "m"
          flag: yes
          help: "minify the app.js output via UglifyJS"
      callback: (options) ->
        brunch.build parseOpts options

    watch:
      help: "Watch brunch directory and rebuild if something changed"
      opts:
        buildPath:
          abbr: "o"
          help: "build path"
          metavar: "DIRECTORY"
          full: "output"
        minify:
          abbr: "m"
          flag: yes
          help: "minify the app.js output via UglifyJS"
      callback: (options) ->
        brunch.watch parseOpts options

    generate:
      help: "Generate model, view or route for current project"
      opts:
        generator:
          position: 1
          help: "generator type"
          metavar: "GENERATOR"
          choices: ["collection", "model", "router", "style", "template", "view"]
          required: yes
        name:
          position: 2
          help: "generator class name / filename"
          metavar: "NAME"
          required: yes
      callback: (options) ->
        brunch.generate parseOpts options

    test:
      help: "Run tests for a brunch project"
      opts:
        verbose:
          abbr: "v"
          flag: yes
          help: "set verbose option for test runner"
      callback: (options) ->
        brunch.test parseOpts options

  globalOpts:
    version:
      abbr: "v"
      help: "display brunch version"
      flag: yes
      callback: -> brunch.VERSION

  scriptName: "brunch"

  help: (parser) ->
    str = ""
    str += "commands:\n"
    {commands, script} = parser.usage()
    for name, command of commands
      str += "   #{script} #{command.name}: #{command.help}\n"
    str += """\n
      To get help on individual command, execute `brunch <command> --help`
    """
    str


class CommandParser
  _setUpParser: ->
    parser = require "nomnom"
    for name, data of @config
      switch name
        when "commands"
          for cmdName, cmdData of data
            command = parser.command cmdName
            for attrName, value of cmdData
              command[attrName] value
        else
          data = data parser if typeof data is "function"
          parser[name] data
    parser

  parse: ->
    @_parser.parseArgs()
    process.stdout.write @_parser.getUsage() unless process.argv[2]

  constructor: (@config) ->
    @_parser = @_setUpParser()

exports.run = ->
  (new CommandParser config).parse()

