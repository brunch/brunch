'use strict'

argumentum = require 'argumentum'
fs = require 'fs'
sysPath = require 'path'
commands = require './'

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
      callback: commands.new

    build:
      abbr: 'b'
      help: 'Build a brunch project'
      options:
        configPath:
          abbr: 'c'
          help: 'path to config file'
          metavar: 'CONFIG'
          full: 'config'
        optimize:
          abbr: 'o'
          flag: yes
          help: 'optimize result files (minify etc.)'
      callback: commands.build

    watch:
      abbr: 'w'
      help: 'Watch brunch directory and rebuild if something changed'
      options:
        configPath:
          abbr: 'c'
          help: 'path to config file'
          metavar: 'CONFIG'
          full: 'config'
        optimize:
          abbr: 'o'
          flag: yes
          help: 'optimize result files (minify etc.)'
        server:
          abbr: 's'
          flag: yes
          help: 'run a simple http server that would serve public dir'
        port:
          abbr: 'p'
          help: 'if a `server` option was specified, define on which port
the server would run'
          metavar: 'PORT'
      callback: commands.watch

# The function would be executed every time user run `bin/brunch`.
exports.run = ->
  command = process.argv[2]
  if command in ['g', 'd', 'generate', 'destroy']
    console.error '''`brunch generate / destroy` command was removed.

    Use scaffolt (https://github.com/paulmillr/scaffolt)
    successor or similar:
        npm install -g scaffolt
        scaffolt <type> <name> [options]
        scaffolt <type> <name> [options] --revert
    '''
  if command in ['t', 'test']
    console.error '''`brunch test` command was removed.

    Use mocha-phantomjs (http://metaskills.net/mocha-phantomjs/)
    successor or similar:
        npm install -g mocha-phantomjs
        mocha-phantomjs [options] <your-html-file-or-url>
    '''
  if command in ['-v', '--version']
    return console.log require('../package.json').version
  argumentum.load(commandLineConfig).parse()
