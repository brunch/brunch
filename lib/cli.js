'use strict';

/* eslint-disable prefer-arrow-callback, prefer-template */
/* eslint-env es6:false */
var version = process.version;
var verDigit = +version.match(/^v(\d+)/)[1];

if (verDigit < 4) {
  console.error(
    'Your global Brunch installation is trying to load local Brunch 2+, ' +
    'which only supports node.js v4 or higher (you have ' + version + ').\n' +
    'You have two choices:\n' +
    '  a) Update node.js to v4+. Then update global Brunch: ' +
    '`npm un -g brunch && npm i -g brunch`\n' +
    '  b) Adjust package.json to use Brunch 1.x (outdated, not recommended).'
  );
  process.exit(1);
}

// The files use ES2015, which cannot be used with old Brunches.
var program = require('commander');
var logger = require('loggy');
var commands = require('./');

var aliases = {
  n: 'new',
  b: 'build',
  w: 'watch',
};

Object.values(aliases).forEach(function(cmd) {
  aliases[cmd] = cmd;
});

program
  .version(require('../package.json').version, '-v, --version')
  .usage('[command] [options]');

program.command('new [path]')
  .description('Create new Brunch project in path [.]. Shortcut: n')
  .option('-s, --skeleton [name]', 'skeleton name or URL from brunch.io/skeletons')
  .on('--help', function() {
    require('init-skeleton').printBanner('brunch new -s');
  })
  .action(commands.new);

program.command('build [path]')
  .description('Build a Brunch project. Shortcut: b')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs [num]', 'parallelize the build')
  .action(commands.build);

program.command('watch [path]')
  .description('Watch Brunch directory and rebuild if something changed. Shortcut: w')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-s, --server', 'run a simple http server for the public dir on localhost')
  .option('-n, --network', 'if `server` was given, allow access from the network')
  .option('-P, --port [port]', 'if `server` was given, listen on this port')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs [num]', 'parallelize the build')
  .option('--stdin', 'listen to stdin and exit when stdin closes')
  .action(commands.watch);

var checkForRemovedOptions = function(args, command) {
  var hasArg = function(deprs) {
    return deprs.some(function(arg) {
      return args.includes(arg);
    });
  };
  var hasCommand = function(valid) {
    return valid.includes(command);
  };
  // Deprecations
  if (hasArg(['-c', '--config'])) {
    return '--config has been removed. Use `-e / --environment` and specify custom envorinments in config';
  }
  if (hasArg(['-o', '--optimize'])) {
    return '--optimize has been removed. Use `-p / --production`';
  }
  if (hasCommand(['g', 'd', 'generate', 'destroy'])) {
    return '`brunch generate / destroy` command has been removed.\n\nUse scaffolt (https://github.com/paulmillr/scaffolt)\nsuccessor or similar:\n    npm install -g scaffolt\n    scaffolt <type> <name> [options]\n    scaffolt <type> <name> [options] --revert';
  }
  if (hasCommand(['t', 'test'])) {
    return '`brunch test` command has been removed.\n\nUse mocha-phantomjs (http://metaskills.net/mocha-phantomjs/)\nsuccessor or similar:\n    npm install -g mocha-phantomjs\n    mocha-phantomjs [options] <your-html-file-or-url>';
  }
  var pIndex = args.indexOf('-p');
  if (pIndex !== -1) {
    // if -p is followed by a number, the user probably wants to specify the port
    // the new option name for port is -P
    var port = +args[pIndex + 1];
    if (Number.isInteger(port)) {
      var parsed = args.slice(2).map(function(arg) {
        return arg === '-p' ? '-P' : arg;
      });
      var corrected = ['brunch'].concat(parsed).join(' ');
      return 'The `-p` option is no longer used to specify the port. Use `-P` instead, e.g. `' + corrected + '`';
    }
  }
};

// The fn would be executed every time user run `bin/brunch`.
exports.run = function() {
  var args = process.argv.slice();

  // Need this since `brunch` binary will fork and run `run-cli`,
  // but we still want to see `brunch` in help.
  args[1] = 'brunch';

  // Check if it's alias.
  var command = args[2];
  var validCommand = aliases[command];
  if (validCommand) args[2] = validCommand;

  var error = checkForRemovedOptions(args, command);
  if (error) {
    logger.error(error);
    return;
  }

  program.parse(args);
  if (!validCommand) program.help();
};
