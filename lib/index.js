'use strict';
require('micro-es7-shim');

const logger = require('loggy');
Object.assign(logger.notifications, {
  app: 'Brunch',
  icon: `${__dirname}/logo.png`,
});

const initSkeleton = require('init-skeleton').init;
const {spin} = require('./workers');
const cpus = require('os').cpus().length;
const defaultSkeleton = process.env.BRUNCH_INIT_SKELETON || 'simple';
const defaultJobs = Math.trunc(process.env.BRUNCH_JOBS || cpus / 2);
const defaultConfig = 'brunch-config';
const Brunch = require('./brunch');

const makeServer = params => {
  const server = {};

  if (params.server) server.run = true;
  if (params.network) server.hostname = '0.0.0.0';
  if ('port' in params) server.port = params.port;

  return server;
};

const {toArr, uniq} = require('./helpers');
const makeEnv = env => {
  const env = toArr(params.env);

  if ('BRUNCH_ENV' in process.env) {
    env.unshift(process.env.BRUNCH_ENV);
  } else if ('NODE_ENV' in process.env) {
    env.unshift(process.env.NODE_ENV);
  }

  if (params.production) {
    env.unshift('production');
  }

  return uniq(env);
};

const normPartConfig = params => {
  const norm = {
    env: makeEnv(params),
    server: makeServer(params),
  };

  if ('publicPath' in params) {
    norm.paths = {
      public: params.publicPath,
    };
  }

  return norm;
};

const processParams = params => {
  if ('path' in params) {
    process.chdir(params.path);
  }

  if (params.stdin) {
    process.stdin // order???
      .resume()
      .on('end', () => {
        process.exit(0);
      });
  }

  spin(params.jobs || defaultJobs);
};

const brunchFactory = params => {
  const configPath = params.config || defaultConfig;
  const partConfig = normPartConfig(params);
  processParams(params);

  return new Brunch(configPath, partConfig)
};

exports.new = (rootPath, skeleton) => {
  return initSkeleton(skeleton || defaultSkeleton, {
    rootPath,
    logger,
    commandName: 'brunch new',
  });
};

exports.build = params => {
  const brunch = brunchFactory(params);

  brunch.on('compile', () => {
    process.on('exit', code => {
      process.exit(logger.errorHappened ? 1 : code);
    });
  });

  return brunch;
};

exports.watch = params => {
  const brunch = brunchFactory(params);
  brunch.initWatcher();

  return brunch;
};
