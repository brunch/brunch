'use strict';
const program = require('commander');
const logger = require('loggy');
const brunch = require('..');
const list = items => items.split(/,\s*/);

const checkLegacyNewArgs = (path, options) => {
  let skeleton = options.skeleton;
  if (!skeleton && args.length > 4) {
    path = args[4];
    skeleton = args[3];

    logger.error(`\`brunch new ${skeleton} ${path}\` is deprecated. Use \`brunch new ${path} -s ${skeleton}\``);
    process.exit(1);
  }

  brunch.new(path, skeleton);
};

const run = start => (path, options) => {
  const withPath = Object.assign({path}, options);
  start(withPath);
};

program
  .version(require('../package.json').version, '-v, --version')
  .usage('<command> [options]');

program
  .command('new [path]')
  .description('Create new Brunch project in path.')
  .alias('n')
  .option('-s, --skeleton <alias>', 'skeleton alias or URL from brunch.io/skeletons')
  .action(checkLegacyNewArgs)
  .on('--help', () => {
    require('init-skeleton').printBanner('brunch new -s');
  });

program
  .command('build [path]')
  .description('Build a Brunch project.')
  .alias('b')
  .option('-e, --env <list>', 'specify a set of override settings to apply', list, [])
  .option('-p, --production', 'same as `--env production`')
  .option('-c, --config <path>', 'specify a path to Brunch config file')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs <int>', 'parallelize the build')
  .action(run(brunch.build));

program
  .command('watch [path]')
  .description('Watch Brunch directory and rebuild if something changed.')
  .alias('w')
  .option('-e, --env <list>', 'specify a set of override settings to apply', list, [])
  .option('-p, --production', 'same as `--env production`')
  .option('-c, --config <path>', 'specify a path to Brunch config file')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs <int>', 'parallelize the build')
  // watch-specific params:
  .option('-s, --server', 'run a simple HTTP server for the public dir on localhost')
  .option('-n, --network', 'if `server` was given, allow access from the network')
  .option('-P, --port <port>', 'if `server` was given, listen on this port')
  .option('--stdin', 'listen to stdin and exit when stdin closes')
  .option('--public-path <path>', 'relative path to `public` directory')
  .action(run(brunch.watch));

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

const checkForRemovedOptions = () => {
  if (['g', 'generate', 'd', 'destroy'].includes(command)) return generateRemoved;
  if (['t', 'test'].includes(command)) return testRemoved;

  if (args.includes('-o') || args.includes('--optimize')) {
    return '`--optimize` has been removed. Use `-p / --production`';
  }

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

const args = process.argv.slice();
const command = args[2];

// Need this since `brunch` binary will fork and run `run-cli`,
// but we still want to see `brunch` in help.
args[1] = 'brunch';

const error = checkForRemovedOptions();
if (error) {
  logger.error(error);
  process.exit(1);
}

program.parse(args);

const validCommand = program.commands.some(cmd => {
  return cmd.name() === command || cmd.alias() === command;
});

if (!validCommand) program.help();
