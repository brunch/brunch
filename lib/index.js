'use strict';

const initSkeleton = require('init-skeleton').init;
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

const defaultSkeleton = 'https://github.com/brunch/dead-simple';

module.exports = {
  "new": (path, options) => {
    const skeleton = options.skeleton || process.env.BRUNCH_INIT_SKELETON || defaultSkeleton;
    return initSkeleton(skeleton, {
      rootPath: path,
      commandName: 'brunch new',
      logger: loggy
    });
  },
  build: start.bind(null, false),
  watch: start.bind(null, true)
};
