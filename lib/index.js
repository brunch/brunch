'use strict';

const logger = require('loggy');
Object.assign(logger.notifications, {
  app: 'Brunch',
  icon: `${__dirname}/logo.png`,
});

const {toArr, uniq} = require('./utils');
const {spin} = require('./workers');
const cpus = require('os').cpus().length;
const defaultJobs = Math.trunc(process.env.BRUNCH_JOBS || cpus / 2);
const defaultConfig = 'brunch-config';
const defaultSkeleton = process.env.BRUNCH_INIT_SKELETON || 'simple';
const initSkeleton = require('init-skeleton').init;
const Brunch = require('./brunch');

const getEnv = params => {
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

const getServer = params => {
  const server = {};

  if (params.server) server.run = true;
  if (params.network) server.hostname = '0.0.0.0';
  if ('port' in params) server.port = params.port;

  return server;
};

const normPartConfig = params => {
  const norm = {
    env: getEnv(params),
    server: getServer(params),
  };

  if ('publicPath' in params) {
    norm.paths = {
      public: params.publicPath,
    };
  }

  return norm;
};

const applyParams = params => {
  if ('path' in params) {
    process.chdir(params.path);
  }

  if (params.stdin) {
    process.stdin
      .on('data', () => {})
      .on('end', () => {
        process.exit(0);
      });
  }

  spin(params.jobs || defaultJobs);
};

const brunchFactory = params => {
  applyParams(params);

  const configPath = params.config || defaultConfig;
  const partConfig = normPartConfig(params);

  return new Brunch(configPath, partConfig);
};

exports.new = (rootPath, skeleton) => {
  return initSkeleton(skeleton || defaultSkeleton, {
    rootPath,
    logger,
    commandName: 'brunch new',
  });
};

exports.watch = brunchFactory;
exports.build = params => {
  const brunch = brunchFactory(params);

  brunch.on('compile', () => {
    process.on('exit', code => {
      process.exit(logger.errorHappened ? 1 : code);
    });
  });

  return brunch;
};
