'use strict';
const cli = require('commander');
const logger = require('loggy');
const brunch = require('..');

const checkLegacyNewArgs = (path, options) => {
  let skeleton = options.skeleton;
  if (!skeleton && args.length > 4) {
    path = args[4];
    skeleton = args[3];

    logger.error(`\`brunch new ${skeleton} ${path}\` is deprecated. Use \`brunch new ${path} -s ${skeleton}\``);
  } else {
    brunch.new(path, skeleton);
  }
};

const list = items => items.split(/\s*,\s*/);
const int = Math.trunc;

const run = start => (path, options) => {
  start(Object.assign({path}, options));
};

cli
  .version(require('../package.json').version, '-v, --version')
  .usage('<command> [options]');

cli
  .command('new [path]')
  .description('Create new Brunch project in path.')
  .alias('n')
  .option('-s, --skeleton <alias>', 'skeleton alias or URL from brunch.io/skeletons')
  .action(checkLegacyNewArgs)
  .on('--help', () => {
    require('init-skeleton').printBanner('brunch new -s');
  });

cli
  .command('build [path]')
  .description('Build a Brunch project.')
  .alias('b')
  .option('-e, --env <list>', 'specify a set of override settings to apply', list, [])
  .option('-p, --production', 'same as `--env production`')
  .option('-c, --config <path>', 'specify a path to Brunch config file')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs <int>', 'parallelize the build', int)
  .action(run(brunch.build));

cli
  .command('watch [path]')
  .description('Watch Brunch directory and rebuild if something changed.')
  .alias('w')
  .option('-e, --env <list>', 'specify a set of override settings to apply', list, [])
  .option('-p, --production', 'same as `--env production`')
  .option('-c, --config <path>', 'specify a path to Brunch config file')
  .option('-d, --debug [pattern]', 'print verbose debug output to stdout')
  .option('-j, --jobs <int>', 'parallelize the build', int)
  // watch-specific params:
  .option('-s, --server', 'run a simple HTTP server for the public dir on localhost')
  .option('-n, --network', 'if `server` was given, allow access from the network')
  .option('-P, --port <int>', 'if `server` was given, listen on this port', int)
  .option('--stdin', 'listen to stdin and exit when stdin closes')
  .option('--public-path <path>', 'relative path to `public` directory')
  .action(run(brunch.watch));

const generateRemoved = `\`brunch generate / destroy\` command has been removed.

Use scaffolt (https://github.com/paulmillr/scaffolt) successor or similar:
\tnpm install -g scaffolt
\tscaffolt <type> <name> [options]
\tscaffolt <type> <name> [options] --revert`;

const testRemoved = `\`brunch test\` command has been removed.

Use mocha-phantomjs (https://github.com/nathanboktae/mocha-phantomjs) successor or similar:
\tnpm install -g mocha-phantomjs
\tmocha-phantomjs [options] <your-html-file-or-url>`;

cli
  .command('*')
  .action(cmd => {
    if (['g', 'generate', 'd', 'destroy'].includes(cmd)) logger.error(generateRemoved);
    else if (['t', 'test'].includes(cmd)) logger.error(testRemoved);
    else cli.help();
  });

const logDeprecations = () => {
  if (args.includes('-o') || args.includes('--optimize')) {
    logger.error('`--optimize` has been removed. Use `-p / --production`');
  }

  const pIndex = args.indexOf('-p');
  if (pIndex === -1) return;

  const port = +args[pIndex + 1];
  if (!Number.isInteger(port)) return;

  const correct = args.slice(1).map(arg => arg === '-p' ? '-P' : arg).join(' ');
  logger.error(`The \`-p\` option is no longer used to specify the port. Use \`-P\` instead, e.g. \`${correct}\``);
};

const args = process.argv.slice();

// Need this since `brunch` binary will fork and run `run-cli`,
// but we still want to see `brunch` in help.
args[1] = 'brunch';

logDeprecations();
if (logger.errorHappened) process.exit(1);

cli.parse(args);
