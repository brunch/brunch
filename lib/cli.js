'use strict';

const program = require('commander');
const commands = require('./');
const aliases = {
  n: 'new',
  b: 'build',
  w: 'watch'
};

Object.keys(aliases).forEach(function(key) {
  var value;
  value = aliases[key];
  return aliases[value] = value;
});

program.version(require('../package.json').version).usage('[command] [options]');

program.command('new [skeleton] [path]').description('Create new brunch project in path [.]. Short-cut: n').action(function() {
  return commands["new"](program.args[0], program.args[1]);
});

const buildCmd = program.command('build [path]').description('Build a brunch project. Short-cut: b').option('-e, --env [setting]', 'specify a set of override settings to apply').option('-P, --production', 'same as `--env production`').option('-d, --debug', 'print verbose debug output to stdout').action(commands.build);

const watchCmd = program.command('watch [path]').description('Watch brunch directory and rebuild if something changed. Short-cut: w').option('-e, --env [setting]', 'specify a set of override settings to apply').option('-P, --production', 'same as `--env production`').option('-s, --server', 'run a simple http server that would serve public dir').option('-p, --port [port]', 'if a `server` option was specified, define on which port the server would run').option('-d, --debug', 'print verbose debug output to stdout').option('--stdin', 'listen to stdin and exit when stdin closes').action(commands.watch);

const addDeprecatedOpts = function() {
  return [buildCmd, watchCmd].forEach(function(cmd) {
    return cmd.option('-c, --config [path]', '[DEPRECATED] path to config files').option('-o, --optimize', '[DEPRECATED] same as `--env production`');
  });
};


/* The function would be executed every time user run `bin/brunch`. */

exports.run = function() {
  const args = process.argv.slice();
  const command = args[2];
  const hasArg = function(name) {
    return args.indexOf(name) >= 0;
  };
  const hasCommand = function() {
    var valid;
    valid = 1 <= arguments.length ? [].slice.call(arguments, 0) : [];
    return valid.indexOf(command) >= 0;
  };
  if (hasArg('-c') || hasArg('--config')) {
    console.error('--config is deprecated. Use `-e / --environment` and custom envs in config');
    addDeprecatedOpts();
  }
  if (hasArg('-o') || hasArg('--optimize')) {
    console.error('--optimize is deprecated. Use `-P / --production`');
    addDeprecatedOpts();
  }
  if (hasCommand('g', 'd', 'generate', 'destroy')) {
    console.error('`brunch generate / destroy` command was removed.\n\nUse scaffolt (https://github.com/paulmillr/scaffolt)\nsuccessor or similar:\n    npm install -g scaffolt\n    scaffolt <type> <name> [options]\n    scaffolt <type> <name> [options] --revert');
  }
  if (hasCommand('t', 'test')) {
    console.error('`brunch test` command was removed.\n\nUse mocha-phantomjs (http://metaskills.net/mocha-phantomjs/)\nsuccessor or similar:\n    npm install -g mocha-phantomjs\n    mocha-phantomjs [options] <your-html-file-or-url>');
  }
  if (hasCommand('n', 'new') && hasArg('--skeleton')) {
    return console.error('`--skeleton` option has been removed from `brunch new`.\n\nThe syntax is now simply:\n\nbrunch new <path-or-URI> [optional-output-dir]\nbrunch new github:brunch/dead-simple\nbrunch new gh:paulmillr/brunch-with-chaplin');
  }
  const cmd = aliases[command];
  if (cmd) {
    args[2] = cmd;
  }
  program.parse(args);
  if (!cmd) {
    return program.help();
  }
};
