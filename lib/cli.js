'use strict';
const program = require('commander');
const logger = require('loggy');
const commands = require('.');

program
  .version(require('../package.json').version, '-v, --version')
  .usage('[command] [options]');

program.command('new [path]')
  .alias('n')
  .description('Create new Brunch project in path.')
  .option('-s, --skeleton [name]', 'skeleton name or URL from brunch.io/skeletons')
  .on('--help', () => {
    require('init-skeleton').printBanner('brunch new -s');
  })
  .action(commands.new);

program.command('build [path]')
  .alias('b')
  .description('Build a Brunch project.')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs [num]', 'parallelize the build')
  .option('-c, --config [path]', 'specify a path to Brunch config file')
  .action(commands.build);

program.command('watch [path]')
  .alias('w')
  .description('Watch Brunch directory and rebuild if something changed.')
  .option('-e, --env [setting]', 'specify a set of override settings to apply')
  .option('-p, --production', 'same as `--env production`')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs [num]', 'parallelize the build')
  .option('-c, --config [path]', 'specify a path to Brunch config file')
  // watch-specific params:
  .option('-s, --server', 'run a simple HTTP server for the public dir on localhost')
  .option('-n, --network', 'if `server` was given, allow access from the network')
  .option('-P, --port [port]', 'if `server` was given, listen on this port')
  .option('--stdin', 'listen to stdin and exit when stdin closes')
  .option('--public-path [path]', 'relative path to `public` directory')
  .action(commands.watch);

const generateRemoved = `\`brunch generate / destroy\` command has been removed.

Use scaffolt (https://github.com/paulmillr/scaffolt)
successor or similar:
\tnpm install -g scaffolt
\tscaffolt <type> <name> [options]
\tscaffolt <type> <name> [options] --revert`;

const testRemoved = `\`brunch test\` command has been removed.

Use mocha-phantomjs (http://metaskills.net/mocha-phantomjs/)
successor or similar:
\tnpm install -g mocha-phantomjs
\tmocha-phantomjs [options] <your-html-file-or-url>`;

// Deprecations
const checkForRemovedOptions = (command, args) => {
  const hasCommand = valid => valid.includes(command);
  const hasArg = deprs => {
    return deprs.some(arg => args.includes(arg));
  };

  if (hasCommand(['g', 'generate', 'd', 'destroy'])) return generateRemoved;
  if (hasCommand(['t', 'test'])) return testRemoved;
  if (hasArg(['-o', '--optimize'])) return '`--optimize` has been removed. Use `-p / --production`';

  const pIndex = args.indexOf('-p');
  if (pIndex === -1) return;
  const port = +args[pIndex + 1];
  if (Number.isInteger(port)) {
    // if `-p` is followed by a number, the user probably wants to specify the port
    // the new option name for port is `-P`
    const parsed = args.slice(2).map(arg => arg === '-p' ? '-P' : arg);
    const corrected = ['brunch'].concat(parsed).join(' ');
    return `The \`-p\` option is no longer used to specify the port. Use \`-P\` instead, e.g. \`${corrected}\``;
  }
};

// The fn would be executed every time user run `bin/brunch`.
exports.run = () => {
  const args = process.argv.slice();
  const command = args[2];

  // Need this since `brunch` binary will fork and run `run-cli`,
  // but we still want to see `brunch` in help.
  args[1] = 'brunch';

  const error = checkForRemovedOptions(command, args);
  if (error) {
    logger.error(error);
    return;
  }

  program.parse(args);

  const validCommand = program.commands.some(cmd => {
    return cmd.name() === command || cmd.alias() === command;
  });

  if (!validCommand) program.help();
};
