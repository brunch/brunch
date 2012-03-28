argumentum = require 'argumentum'
fs = require 'fs'
sysPath = require 'path'
brunch = require './brunch'
helpers = require './helpers'
logger = require './logger'

# Reads package.json and extracts brunch version from there.
# Returns string.
exports.readPackageVersion = readPackageVersion = ->
  content = fs.readFileSync sysPath.join __dirname, '..', 'package.json'
  (JSON.parse content).version

generatorChoices = [
  'collection', 'model', 'router', 'style', 'template', 'view'
]

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
          help: 'root path of project'
          metavar: 'ROOT_PATH'
          required: yes
        skeleton:
          abbr: 's'
          help: 'path to / git URL of application skeleton (template).'
      callback: brunch.new

    build:
      abbr: 'b'
      help: 'Build a brunch project'
      options:
        configPath:
          abbr: 'c'
          help: 'path to config file'
          metavar: 'CONFIG'
          full: 'config'
      callback: brunch.build

    watch:
      abbr: 'w'
      help: 'Watch brunch directory and rebuild if something changed'
      options:
        configPath:
          abbr: 'c'
          help: 'path to config file'
          metavar: 'CONFIG'
          full: 'config'
        server:
          abbr: 's'
          flag: yes
          help: 'run a simple http server that would serve public dir'
        port:
          abbr: 'p'
          help: 'if a `server` option was specified, define on which port 
the server would run'
          metavar: 'PORT'
      callback: brunch.watch

    generate:
      abbr: 'g'
      help: 'Generate file(s) from template for current project'
      options:
        type:
          position: 1
          help: 'generator type'
          choices: generatorChoices
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
        configPath:
          abbr: 'c'
          help: 'path to config file'
          metavar: 'CONFIG'
          full: 'config'
      callback: brunch.generate

    destroy:
      abbr: 'd'
      help: 'Destroy changes made by brunch generate for current project'
      options:
        type:
          position: 1
          help: 'generator type'
          choices: generatorChoices
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
        configPath:
          abbr: 'c'
          help: 'path to config file'
          metavar: 'CONFIG'
          full: 'config'
      callback: brunch.destroy

  options:
    version:
      abbr: 'v'
      help: 'display brunch version'
      flag: yes
      callback: readPackageVersion

# The function would be executed every time user run `bin/brunch`.
exports.run = ->
  argumentum.load(commandLineConfig).parse()
