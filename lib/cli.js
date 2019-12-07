'use strict';

/* eslint-disable prefer-arrow-callback, prefer-template */
/* eslint-env es6:false */
// Not using ES6 in that file since we want it to "launch" on older nodes.
var version = process.versions.node;
if (parseInt(version) < 10) {
  console.error(
    'Your global Brunch installation is trying to load local Brunch v3+, ' +
    'which only supports Node.js v10.16 or higher (you have ' + version + ').\n' +
    'You have two choices:\n' +
    '  a) Update Node.js to v10+. Then update global Brunch: ' +
    '`npm un -g brunch && npm i -g brunch`\n' +
    '  b) Adjust package.json to use Brunch 2.x (outdated, not recommended).'
  );
  process.exit(1);
}

// The files use ES2015, which cannot be used with old Brunches.
var program = require('commander');
var logger = require('loggy');
var commands = require('.');

function wrapCommand(name) {
  return (arg1, arg2) => {
    arg2.path = arg1 || '.';
    return commands[name](arg2);
  };
}

program
  .version(require('../package.json').version, '-v, --version')
  .usage('[command] [options]');

program.command('new [path]')
  .alias('n')
  .description('Create new Brunch project in path.')
  .option('-s, --skeleton [name]', 'skeleton name or URL from brunch.io/skeletons')
  .on('--help', function() {
    require('./init-skeleton').printErrorBanner();
  })
  .action(wrapCommand('new'));

program.command('build [path]')
  .alias('b')
  .description('Build a Brunch project.')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs [num]', 'parallelize the build')
  .option('-c, --config [path]', 'specify a path to Brunch config file')
  .action(wrapCommand('build'));

program.command('watch [path]')
  .alias('w')
  .description('Watch Brunch directory and rebuild if something changed.')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-s, --server', 'run a simple http server for the public dir on localhost')
  .option('-n, --network', 'if `server` was given, allow access from the network')
  .option('-P, --port [port]', 'if `server` was given, listen on this port')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs [num]', 'parallelize the build')
  .option('-c, --config [path]', 'specify a path to Brunch config file')
  .option('--stdin', 'listen to stdin and exit when stdin closes')
  .action(wrapCommand('watch'));

var checkForRemovedOptions = function(args) {
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
  var command = args[2];

  // Need this since `brunch` binary will fork and run `run-cli`,
  // but we still want to see `brunch` in help.
  args[1] = 'brunch';

  var error = checkForRemovedOptions(args);
  if (error) {
    logger.error(error);
    return;
  }

  program.parse(args);

  var validCommand = program.commands.some(function(cmd) {
    return cmd.name() === command || cmd.alias() === command;
  });

  if (!validCommand) program.help();
};
