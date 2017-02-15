'use strict';
require('micro-es7-shim');
require('promise.prototype.finally').shim();

const logger = require('loggy');
Object.assign(logger.notifications, {
  app: 'Brunch',
  icon: `${__dirname}/logo.png`,
});

const initSkeleton = require('init-skeleton').init;
const cpus = require('os').cpus().length;
const defaultSkeleton = process.env.BRUNCH_INIT_SKELETON || 'simple';
const defaultJobs = Math.trunc(process.env.BRUNCH_JOBS || cpus / 2);

const normalizeParams = params => {
  const norm = {
    env: [].concat(params.env),
    jobs: params.jobs || defaultJobs,
    stdin: !!params.stdin,
  };

  if (params.path) {
    process.chdir(params.path);
  }

  if (params.publicPath) {
    norm.paths = {
      public: params.publicPath,
    };
  }

  const server = norm.server = {};
  if (params.server) server.run = true;
  if (params.network) server.hostname = '0.0.0.0';
  if (params.port) server.port = params.port;

  let debug = params.debug;
  if (debug) {
    if (debug === true) debug = '*';
    if (debug !== 'speed') debug = `brunch:${debug}`;

    process.env.DEBUG = debug;
  }

  return norm;
};

const start = override => params => {
  const merged = Object.assign({}, normalizeParams(params), override);

  // We require `watch` after we assigned `process.env.DEBUG` any value.
  // Otherwise it would be `undefined` and debug messages wouldn't be shown.
  const watcher = require('./watch');

  return watcher(merged);
};

exports.new = (rootPath, skeleton) => {
  return initSkeleton(skeleton || defaultSkeleton, {
    rootPath,
    logger,
    commandName: 'brunch new',
  });
};

exports.build = start({persist: false});
exports.watch = start({persist: true});
