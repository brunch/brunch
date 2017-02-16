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
const defaultConfig = 'brunch-config';
const toArray = val => val == null ? [] : [].concat(val);
const dedupe = arr => Array.from(new Set(arr));
const noop = () => {};

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

  return norm;
};

const normWatcherOptions = params => {
  let debug = params.debug;
  if (debug) {
    if (debug === true) debug = '*';
    if (debug !== 'speed') debug = `brunch:${debug}`;

    process.env.DEBUG = debug;
  }

  if (params.path) {
    process.chdir(params.path);
  }

  const envs = toArray(params.env);
  if (params.production) {
    envs.push('production');
  }

  if ('BRUNCH_ENV' in process.env) {
    envs.push(process.env.BRUNCH_ENV);
  } else if ('NODE_ENV' in process.env) {
    envs.push(process.env.NODE_ENV);
  }

  if (envs.includes('production')) {
    process.env.NODE_ENV = 'production';
  } else if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }

  return {
    envs: dedupe(envs),
    jobs: params.jobs || defaultJobs,
    stdin: !!params.stdin,
    onCompile: params.onCompile || noop,
    _onReload: params._onReload || noop,
  };
};

const watcher = override => params => {
  const options = Object.assign({}, normWatcherOptions(params), override);
  const config = normPartialConfig(params);

  // We require `watch` after we assigned `process.env.DEBUG` any value.
  // Otherwise it would be `undefined` and debug messages wouldn't be shown.
  const BrunchWatcher = require('./watch');

  return new BrunchWatcher(options, config);
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
