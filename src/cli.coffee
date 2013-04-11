'use strict'

argumentum = require 'argumentum'
fs = require 'fs'
sysPath = require 'path'
commands = require './'

#!/usr/bin/env node

program = require('commander');

program
  .version(require('../package.json').version)

program
  .command('new [path]')
  .description('Create new brunch project in path [.]. Short-cut: n')
  .option('-s, --skeleton [url-or-path]', 'path to / git URL of application skeleton (template)')
  .action ->
    commands.new program.skeleton, program.args[0]

program
  .command('build')
  .description('Build a brunch project. Short-cut: b')
  .option('-c, --config [path]', 'path to config files')
  .option('-o, --optimize', 'optimize result files (minify etc.)')
  .action(commands.build)

program
  .command('watch')
  .description('Watch brunch directory and rebuild if something changed. Short-cut: w')
  .option('-c, --config [path]', 'path to config files')
  .option('-o, --optimize', 'optimize result files (minify etc.)')
  .option('-s, --server', 'run a simple http server that would serve public dir')
  .option('-p, --port [port', 'if a `server` option was specified, define on which port
the server would run')
  .action(commands.watch)

# The function would be executed every time user run `bin/brunch`.
exports.run = ->
  args = process.argv.slice()
  command = args[2]

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

  fullCommand = switch command
    when 'n' then 'new'
    when 'b' then 'build'
    when 'w' then 'watch'
    else command
  args[2] = fullCommand if fullCommand?
  program.parse args
  program.help() unless fullCommand?
