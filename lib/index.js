'use strict';

const initSkeleton = require('init-skeleton');
const loggy = require('loggy');
const hasDebug = obj => {
  return obj && typeof obj === 'object' && obj.debug;
};

const start = () => {
  const args = [].slice.call(arguments, 0);
  const isDebug = hasDebug(args[1]) || hasDebug(args[2]);
  if (isDebug) {
    process.env.DEBUG = 'brunch:*';
  }
  const fn = require('./watch');
  return fn.apply(null, args);
};

module.exports = {
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
