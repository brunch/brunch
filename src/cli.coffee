'use strict'

program = require 'commander'
commands = require './'

aliases = {n: 'new', b: 'build', w: 'watch'}
Object.keys(aliases).forEach (key) ->
  value = aliases[key]
  aliases[value] = value

program
  .version(require('../package.json').version)
  .usage('[command] [options]')

program
  .command('new [skeleton] [path]')
  .description('Create new brunch project in path [.]. Short-cut: n')
  .action ->
    commands.new program.args[0], program.args[1]

buildCmd = program
  .command('build [path]')
  .description('Build a brunch project. Short-cut: b')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-P, --production', 'same as `--env production`')
  .option('-d, --debug', 'print verbose debug output to stdout')
  .action(commands.build)

watchCmd = program
  .command('watch [path]')
  .description('Watch brunch directory and rebuild if something changed. Short-cut: w')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-P, --production', 'same as `--env production`')
  .option('-s, --server', 'run a simple http server that would serve public dir')
  .option('-p, --port [port]', 'if a `server` option was specified, define on which port
 the server would run')
  .option('-d, --debug', 'print verbose debug output to stdout')
  .action(commands.watch)

addDeprecatedOpts = ->
  [buildCmd, watchCmd].forEach (cmd) ->
    cmd
      .option('-c, --config [path]', '[DEPRECATED] path to config files')
      .option('-o, --optimize', '[DEPRECATED] same as `--env production`')

# The function would be executed every time user run `bin/brunch`.
exports.run = ->
  args = process.argv.slice()
  command = args[2]

  if '-c' in args or '--config' in args
    console.error '--config is deprecated. Use `-e / --environment` and custom envs in config'
    addDeprecatedOpts()

  if '-o' in args or '--optimize' in args
    console.error '--optimize is deprecated. Use `-P / --production`'
    addDeprecatedOpts()

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

  cmd = aliases[command]
  args[2] = cmd if cmd
  program.parse args
  program.help() unless cmd
