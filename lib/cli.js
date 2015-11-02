'use strict';

const program = require('commander');
const commands = require('./');
const aliases = {
  n: 'new',
  b: 'build',
  w: 'watch'
};

Object.keys(aliases).forEach(key => {
  const value = aliases[key];
  return aliases[value] = value;
});

program.version(require('../package.json').version).usage('[command] [options]');

program.command('new [skeleton] [path]')
  .description('Create new brunch project in path [.]. Short-cut: n')
  .action(() => {
    return commands["new"](program.args[0], program.args[1]);
  });

const buildCmd = program.command('build [path]')
  .description('Build a brunch project. Short-cut: b')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-d, --debug', 'print verbose debug output to stdout')
  .action(commands.build);

const watchCmd = program.command('watch [path]')
  .description('Watch brunch directory and rebuild if something changed. Short-cut: w')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-s, --server', 'run a simple http server that would serve public dir')
  .option('-P, --port [port]', 'if a `server` option was specified, define on which port the server would run')
  .option('-d, --debug', 'print verbose debug output to stdout')
  .option('--stdin', 'listen to stdin and exit when stdin closes')
  .action(commands.watch);

const checkForRemovedOptions = (args, command) => {
  const hasArg = name => args.indexOf(name) >= 0;
  const hasCommand = (valid) => valid.indexOf(command) >= 0;
  // Deprecations
  if (hasArg('-c') || hasArg('--config')) {
    return '--config has been removed. Use `-e / --environment` and specify custom envorinments in config';
  }
  if (hasArg('-o') || hasArg('--optimize')) {
    return '--optimize has been removed. Use `-P / --production`';
  }
  if (hasCommand(['g', 'd', 'generate', 'destroy'])) {
    return '`brunch generate / destroy` command has been removed.\n\nUse scaffolt (https://github.com/paulmillr/scaffolt)\nsuccessor or similar:\n    npm install -g scaffolt\n    scaffolt <type> <name> [options]\n    scaffolt <type> <name> [options] --revert';
  }
  if (hasCommand(['t', 'test'])) {
    return '`brunch test` command has been removed.\n\nUse mocha-phantomjs (http://metaskills.net/mocha-phantomjs/)\nsuccessor or similar:\n    npm install -g mocha-phantomjs\n    mocha-phantomjs [options] <your-html-file-or-url>';
  }
  if (hasCommand(['n', 'new']) && hasArg('--skeleton')) {
    return '`--skeleton` option has been removed from `brunch new`.\n\nThe syntax is now simply:\n\nbrunch new <path-or-URI> [optional-output-dir]\nbrunch new github:brunch/dead-simple\nbrunch new gh:paulmillr/brunch-with-chaplin';
  }
};

/* The fn would be executed every time user run `bin/brunch`. */

exports.run = () => {
  const args = process.argv.slice();
  const command = args[2];
  const validCommand = aliases[command];
  if (validCommand) args[2] = validCommand;

  const error = checkForRemovedOptions(args, command);
  if (error) return console.log(error);

  program.parse(args);
  if (!validCommand) program.help();
};
