#!/usr/bin/env node

'use strict';
const cli = require('commander');
const {version} = require('../package.json');
const initSkeleton = require('init-skeleton');
const defaultSkeleton = process.env.BRUNCH_INIT_SKELETON || 'simple';
const loggy = require('loggy');
const fromCLI = require('./from-cli');

const parseList = str => str.split(/\s*,\s*/);
const withBuildOptions = cmd => {
  return cmd
    .option('-p, --production', 'shortcut for `--env production`')
    .option('-e, --env <list>', 'specify a set of override settings to apply', parseList, [])
    .option('-c, --config <path>', 'specify a path to Brunch config file')
    .option('-j, --jobs <int>', 'parallelize the build', parseInt);
};

cli
  .version(version, '-v, --version')
  .usage('<command> [options]');

cli
  .command('new [path]')
  .description('Create new Brunch project in path.')
  .alias('n')
  .option('-s, --skeleton <alias>', 'skeleton alias or URL from brunch.io/skeletons')
  .action((rootPath, {skeleton = defaultSkeleton}) => {
    initSkeleton.init(skeleton, {
      rootPath,
      logger: loggy,
      commandName: 'brunch new',
    });
  }).on('--help', () => {
    initSkeleton.printBanner('brunch new -s');
  });

withBuildOptions(
  cli
    .command('build [path]')
    .description('Build a Brunch project.')
    .alias('b')
    .action((path, cmd) => {
      fromCLI({path, ...cmd}).build();
    })
);

withBuildOptions(
  cli
    .command('watch [path]')
    .description('Watch Brunch directory and rebuild if something changed.')
    .alias('w')
    .option('-s, --server', 'run a simple HTTP server for the public dir on localhost')
    .option('-n, --network', 'if `server` was given, allow access from the network')
    .option('-P, --port <int>', 'if `server` was given, listen on this port', parseInt)
    .option('--stdin', 'listen to stdin and exit when stdin closes')
    .option('--public-path <path>', 'relative path to `public` directory')
    .action((path, cmd) => {
      fromCLI({path, ...cmd}).watch();
    })
);

cli
  .command('*')
  .action(() => {
    cli.help();
  });

cli.parse(process.argv);
