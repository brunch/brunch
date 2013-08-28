'use strict'

program = require 'commander'
commands = require './'

program
  .version(require('../package.json').version)

program
  .command('new [skeleton] [path]')
  .description('Create new brunch project in path [.]. Short-cut: n')
  .action ->
    commands.new program.args[0], program.args[1]

program
  .command('build')
  .description('Build a brunch project. Short-cut: b')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-P, --production', 'same as `--env production`')
  .option('-c, --config [path]', '[DEPRECATED] path to config files')
  .option('-o, --optimize', '[DEPRECATED] same as `--env production`')
  .action(commands.build)

program
  .command('watch')
  .description('Watch brunch directory and rebuild if something changed. Short-cut: w')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-P, --production', 'same as `--env production`')
  .option('-s, --server', 'run a simple http server that would serve public dir')
  .option('-p, --port [port]', 'if a `server` option was specified, define on which port
 the server would run')
  .option('-c, --config [path]', '[DEPRECATED] path to config files')
  .option('-o, --optimize', '[DEPRECATED] same as `--env production`')
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
  if command in ['n', 'new'] and '--skeleton' in args
    return console.error '''`--skeleton` option has been removed from `brunch new`.

    The syntax is now simply:

    brunch new <path-or-URI> [optional-output-dir]
    brunch new github:brunch/dead-simple
    brunch new gh:paulmillr/brunch-with-chaplin
    '''

  fullCommand = switch command
    when 'n' then 'new'
    when 'b' then 'build'
    when 'w' then 'watch'
    else command
  args[2] = fullCommand if fullCommand?
  program.parse args
  program.help() unless fullCommand?
