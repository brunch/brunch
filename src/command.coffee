argumentum = require 'argumentum'
fs = require 'fs'
sysPath = require 'path'
brunch = require './brunch'
helpers = require './helpers'

# Reads package.json and extracts brunch version from there.
# Returns string.
exports.readPackageVersion = readPackageVersion = ->
  content = fs.readFileSync sysPath.join __dirname, '..', 'package.json'
  (JSON.parse content).version

generatorChoices = ->
  config = helpers.loadConfig 'config.coffee'
  []

# Config for [argumentum](https://github.com/paulmillr/argumentum).
commandLineConfig =
  script: 'brunch'
  commandRequired: yes
  commands:
    new:
      abbr: 'n'
      help: 'Create new brunch project'
      options:
        rootPath:
          position: 1
          help: 'application path'
          metavar: 'APP_PATH'
          required: yes
          full: 'appPath'
        template:
          abbr: 't'
          help: 'path to application template'
      callback: (options) ->
        brunch.new options, ->
          brunch.install rootPath: options.rootPath

    build:
      abbr: 'b'
      help: 'Build a brunch project'
      options:
        buildPath:
          abbr: 'o'
          help: 'build path'
          metavar: 'DIRECTORY'
          full: 'output'
      callback: (options) ->
        config = helpers.loadConfig 'config.coffee'
        config.buildPath = options.buildPath if options.buildPath
        brunch.build '.', config

    watch:
      abbr: 'w'
      help: 'Watch brunch directory and rebuild if something changed'
      options:
        buildPath:
          abbr: 'o'
          full: 'output'
          help: 'build path'
          metavar: 'DIRECTORY'
        server:
          abbr: 's'
          flag: yes
          help: 'run a simple http server that would server `output` dir'
        port:
          abbr: 'p'
          help: 'if a `server` option was specified, define on which port 
the server would run'
          metavar: 'PORT'
      callback: (options) ->
        config = helpers.loadConfig 'config.coffee'
        config.server ?= {}
        config.server.run = yes if options.server
        config.server.port = options.port if options.port
        config.buildPath = options.buildPath if options.buildPath
        brunch.watch '.', config

    generate:
      abbr: 'g'
      help: 'Generate file(s) from template for current project'
      options:
        type:
          position: 1
          help: 'generator type'
          #choices: generatorChoices
          required: yes
        name:
          position: 2
          help: 'generator class name / filename'
          required: yes
        parentDir:
          abbr: 'p'
          help: 'path to generated file directory'
          metavar: 'DIRECTORY'
          full: 'path'
      callback: (options) ->
        options.rootPath = '.'
        options.config = helpers.loadConfig 'config.coffee'
        brunch.generate options

    destroy:
      abbr: 'd'
      help: 'Destroy changes made by brunch generate for current project'
      options:
        type:
          position: 1
          help: 'generator type'
          #choices: generatorChoices
          required: yes
        name:
          position: 2
          help: 'generator class name / filename'
          required: yes
        parentDir:
          abbr: 'p'
          help: 'path to generated file directory'
          metavar: 'DIRECTORY'
          full: 'path'
      callback: (options) ->
        options.rootPath = '.'
        options.config = helpers.loadConfig 'config.coffee'
        brunch.destroy options

  options:
    version:
      abbr: 'v'
      help: 'display brunch version'
      flag: yes
      callback: readPackageVersion

# The function would be executed every time user run `bin/brunch`.
exports.run = ->
  argumentum.load(commandLineConfig).parse()
