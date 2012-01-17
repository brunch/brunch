argumentum = require 'argumentum'
fs = require 'fs'
path = require 'path'
brunch = require './brunch'
helpers = require './helpers'

# Reads package.json and extracts brunch version from there.
# Returns string.
exports.readPackageVersion = readPackageVersion = ->
  package = JSON.parse fs.readFileSync path.join __dirname, '..', 'package.json'
  package.version

# Config for [argumentum](https://github.com/paulmillr/argumentum).
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
        brunch.new options.rootPath, options.buildPath, ->
          configPath = path.join options.rootPath, 'config.coffee'
          config = helpers.loadConfig path.join options.rootPath, 'config.coffee'
          brunch.build options.rootPath, options.buildPath, config

    build:
      help: 'Build a brunch project'
      options:
        buildPath:
          abbr: 'o'
          help: 'build path'
          metavar: 'DIRECTORY'
          full: 'output'
      callback: (options) ->
        config = helpers.loadConfig 'config.coffee'
        brunch.build '.', options.buildPath, config

    watch:
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
        config.server.port = if options.port
          options.port
        else
          config.server.port or 3333
        config.server.buildPath = options.buildPath if options.buildPath
        brunch.watch '.', config.server.buildPath, config

    generate:
      help: 'Generate model, view or route for current project'
      options:
        type:
          position: 1
          help: 'generator type'
          choices: ['collection', 'model', 'router', 'style', 'template', 'view']
          required: yes
        name:
          position: 2
          help: 'generator class name / filename'
          required: yes
      callback: (options) ->
        config = helpers.loadConfig 'config.coffee'
        brunch.generate '.', options.type, options.name, config

  options:
    version:
      abbr: 'v'
      help: 'display brunch version'
      flag: yes
      callback: readPackageVersion

# The function would be executed every time user run `bin/brunch`.
exports.run = ->
  argumentum.load(commandLineConfig).parse()
