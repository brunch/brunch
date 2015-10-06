'use strict';

const initSkeleton = require('init-skeleton');
const loggy = require('loggy');
const hasDebug = obj => {
  return obj && typeof obj === 'object' && obj.debug;
};

const start = (arg0, arg1, arg2) => {
  const isDebug = hasDebug(arg1) || hasDebug(arg2);
  if (isDebug) {
    process.env.DEBUG = 'brunch:*';
  }
  const fn = require('./watch');
  return fn(arg0, arg1, arg2);
};

const defaultInitSkeleton = 'https://github.com/brunch/dead-simple';

const getInitSkeleton = () => {
  if (process.env.BRUNCH_INIT_SKELETON) {
    return process.env.BRUNCH_INIT_SKELETON;
  };

  return defaultInitSkeleton;
};

module.exports = {
  "init": (path) => {
    return initSkeleton(getInitSkeleton(), {
      rootPath: path,
      commandName: 'brunch init',
      logger: loggy
    });
  },
  "new": (skeleton, path) => {
    return initSkeleton(skeleton, {
      rootPath: path,
      commandName: 'brunch new',
      logger: loggy
    });
  },
  build: start.bind(null, false),
  watch: start.bind(null, true)
};
