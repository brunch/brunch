'use strict';
const cli = require('commander');
const brunch = require('..');

const list = arg => arg.split(/\s*,\s*/);
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
  .option('-j, --jobs <int>', 'parallelize the build', int)
  .action(run(brunch.build));

cli
  .command('watch [path]')
  .description('Watch Brunch directory and rebuild if something changed.')
  .alias('w')
  .option('-e, --env <list>', 'specify a set of override settings to apply', list, [])
  .option('-p, --production', 'same as `--env production`')
  .option('-c, --config <path>', 'specify a path to Brunch config file')
  .option('-j, --jobs <int>', 'parallelize the build', int)
  // watch-specific params:
  .option('-s, --server', 'run a simple HTTP server for the public dir on localhost')
  .option('-n, --network', 'if `server` was given, allow access from the network')
  .option('-P, --port <int>', 'if `server` was given, listen on this port', int)
  .option('--stdin', 'listen to stdin and exit when stdin closes')
  .option('--public-path <path>', 'relative path to `public` directory')
  .action(run(brunch.watch));

cli
  .command('*')
  .action(cmd => {
    cli.help();
  });

cli.parse(process.argv);
