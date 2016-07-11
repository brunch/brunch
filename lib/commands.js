'use strict';
const program = require('commander');
const logger = require('loggy');
const commands = require('./');

const aliases = {
  n: 'new',
  b: 'build',
  w: 'watch'
};

Object.values(aliases).forEach(cmd => {
  aliases[cmd] = cmd;
});

program
  .version(require('../package.json').version, '-v, --version')
  .usage('[command] [options]');

program.command('new [path]')
  .description('Create new Brunch project in path [.]. Shortcut: n')
  .option('-s, --skeleton [name]', 'skeleton name or URL from brunch.io/skeletons')
  .on('--help', () => {
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
  .option('-s, --server', 'run a simple http server that would serve public dir. This is accessible only on the same machine. Set server/hostname to 0.0.0.0 in brunch-config.js to allow access from any machine on the local network.')
  .option('-P, --port [port]', 'if a `server` option was specified, define on which port the server would run')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs [num]', 'parallelize the build')
  .option('--stdin', 'listen to stdin and exit when stdin closes')
  .action(commands.watch);

const checkForRemovedOptions = (args, command) => {
  const hasArg = deprs => deprs.some(arg => args.includes(arg));
  const hasCommand = valid => valid.includes(command);
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
  const pIndex = args.indexOf('-p');
  if (pIndex !== -1) {
    // if -p is followed by a number, the user probably wants to specify the port
    // the new option name for port is -P
    const port = +args[pIndex + 1];
    if (Number.isInteger(port)) {
      const corrected = ['brunch'].concat(args.slice(2).map(x => x === '-p' ? '-P' : x)).join(' ');
      return `The \`-p\` option is no longer used to specify the port. Use \`-P\` instead, e.g. \`${corrected}\``;
    }
  }
};

// The fn would be executed every time user run `bin/brunch`.
exports.run = () => {
  const args = process.argv.slice();

  // Need this since `brunch` binary will fork and run `run-cli`,
  // but we still want to see `brunch` in help.
  args[1] = 'brunch';

  // Check if it's alias.
  const command = args[2];
  const validCommand = aliases[command];
  if (validCommand) args[2] = validCommand;

  const error = checkForRemovedOptions(args, command);
  if (error) {
    logger.error(error);
    return;
  }

  program.parse(args);
  if (!validCommand) program.help();
};
