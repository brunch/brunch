'use strict';
const {toArr, uniq} = require('../lib/utils');
const Brunch = require('..');

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
};

const fromCLI = params => {
  applyParams(params);

  const configPath = params.config || 'brunch-config';
  const partConfig = normPartConfig(params);

  return new Brunch(configPath, partConfig);
};

module.exports = fromCLI;
