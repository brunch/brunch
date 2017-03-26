'use strict';
require('micro-es7-shim');
require('promise.prototype.finally').shim();

const logger = require('loggy');
Object.assign(logger.notifications, {
  app: 'Brunch',
  icon: `${__dirname}/logo.png`,
});

const initSkeleton = require('init-skeleton').init;
const workers = require('./workers');
const cpus = require('os').cpus().length;
const defaultSkeleton = process.env.BRUNCH_INIT_SKELETON || 'simple';
const defaultJobs = Math.trunc(process.env.BRUNCH_JOBS || cpus / 2);
const defaultConfig = 'brunch-config';
const {toArray} = require('./utils/helpers');

const normPartialConfig = params => {
  const norm = {
    paths: {
      config: params.config || defaultConfig,
    },
  };

  if (params.publicPath) {
    norm.paths.public = params.publicPath;
  }

  const server = norm.server = {};
  if (params.server) server.run = true;
  if (params.network) server.hostname = '0.0.0.0';
  if (params.port) server.port = params.port;

  const env = toArray(params.env);

  if ('BRUNCH_ENV' in process.env) {
    env.unshift(process.env.BRUNCH_ENV);
  } else if ('NODE_ENV' in process.env) {
    env.unshift(process.env.NODE_ENV);
  }

  if (params.production) {
    env.unshift('production');
  }

  if (env.includes('production')) {
    process.env.NODE_ENV = 'production';
  } else if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }

  norm.env = [...new Set(env)];

  return norm;
};

const normWatcherOptions = params => {
  let {debug} = params;
  if (debug) {
    if (debug === true) debug = '*';
    if (debug !== 'speed') debug = `brunch:${debug}`;

    process.env.DEBUG = debug;
  }

  if (params.path) {
    process.chdir(params.path);
  }

  if (params.stdin) {
    process.stdin.on('end', () => process.exit(0));
    process.stdin.resume();
  }

  workers.spin(params.jobs || defaultJobs);
};

exports.new = (rootPath, skeleton) => {
  return initSkeleton(skeleton || defaultSkeleton, {
    rootPath,
    logger,
    commandName: 'brunch new',
  });
};

exports.build = watcher({persist: false});
exports.watch = watcher({persist: true});
