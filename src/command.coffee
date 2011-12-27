argumentum = require 'argumentum'
path = require 'path'
brunch = require './brunch'
helpers = require './helpers'

loadConfig = (configPath, callback) ->
  try
    config = (require path.resolve configPath).config
    config.rootPath = path.dirname configPath
    config
  catch error
    helpers.logError "[Brunch]: couldn\'t load config.coffee. #{error}"
    helpers.exit()

commandLineConfig =
  script: 'brunch'
  commandRequired: yes
  commands:
    new:
      help: 'Create new brunch project'
      options:
        rootPath:
          position: 1
          help: 'application path'
          metavar: 'APP_PATH'
          required: yes
          full: 'appPath'
        buildPath:
          abbr: 'o'
          help: 'build path'
          metavar: 'DIRECTORY'
          full: 'output'
      callback: (options) ->
        brunch.new options.rootPath, ->
          configPath = path.join options.rootPath, 'config.coffee'
          config = loadConfig configPath
          config.buildPath = options.buildPath
          brunch.build config

    build:
      help: 'Build a brunch project'
      options:
        buildPath:
          abbr: 'o'
          help: 'build path'
          metavar: 'DIRECTORY'
          full: 'output'
      callback: (options) ->
        config = loadConfig 'config.coffee'
        config.buildPath = options.buildPath
        brunch.build config

    watch:
      help: 'Watch brunch directory and rebuild if something changed'
      options:
        buildPath:
          abbr: 'o'
          help: 'build path'
          metavar: 'DIRECTORY'
          full: 'output'
      callback: (options) ->
        config = loadConfig 'config.coffee'
        config.buildPath = options.buildPath
        brunch.watch config

    generate:
      help: 'Generate model, view or route for current project'
      options:
        type:
          position: 1
          help: 'generator type'
          metavar: 'GENERATOR'
          choices: ['collection', 'model', 'router', 'style', 'template', 'view']
          required: yes
        name:
          position: 2
          help: 'generator class name / filename'
          metavar: 'NAME'
          required: yes
      callback: (options) ->
        brunch.generate options.type, options.name

    test:
      help: 'Run tests for a brunch project'
      options:
        verbose:
          flag: yes
          help: 'set verbose option for test runner'
      callback: (options) ->
        brunch.test options.verbose

  options:
    version:
      abbr: 'v'
      help: 'display brunch version'
      flag: yes
      callback: -> brunch.VERSION

exports.run = ->
  argumentum.load(commandLineConfig).parse()
