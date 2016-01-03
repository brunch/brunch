'use strict';
const loggy = require('loggy');
const initSkeleton = require('init-skeleton').init;
const hasDebug = obj => {
  return obj && typeof obj === 'object' && obj.debug;
};

const defaultSkeleton = 'https://github.com/brunch/dead-simple';

exports.new = (path, options) => {
  const skeleton = options.skeleton ||
    process.env.BRUNCH_INIT_SKELETON || defaultSkeleton;
  return initSkeleton(skeleton, {
    rootPath: path,
    commandName: 'brunch new',
    logger: loggy
  });
};

const start = (arg1, arg2, arg3) => {
  const isDebug = hasDebug(arg2) || hasDebug(arg3);
  if (isDebug) {
    const ns = typeof isDebug === 'string' ? isDebug : '*';
    process.env.DEBUG = `brunch:${ns}`;
  }
  const fn = require('./watch');
  return fn(arg1, arg2, arg3);
};

exports.build = start.bind(null, false);
exports.watch = start.bind(null, true);
