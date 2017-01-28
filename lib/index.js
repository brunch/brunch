'use strict';
require('micro-es7-shim');
require('promise.prototype.finally').shim();
const logger = require('loggy');
const BrunchError = require('./utils/error');
const checkLegacyNewSyntax = options => {
  const rawArgs = options.parent.rawArgs;
  const newArgs = rawArgs.slice(rawArgs.indexOf('new') + 1);
  const oldSyntax = !options.skeleton && newArgs.length === 2;
  if (!oldSyntax) return;

  throw new BrunchError('LEGACY_NEW_SYNTAX', {
    skeleton: newArgs[0],
    path: newArgs[1],
  });
};

const hasDebug = obj => {
  return obj && typeof obj === 'object' && obj.debug;
};

const defaultSkeleton = 'https://github.com/brunch/dead-simple';
exports.new = (rootPath, options) => {
  checkLegacyNewSyntax(options);

  const initSkeleton = require('init-skeleton').init;
  const skeleton = options.skeleton ||
    process.env.BRUNCH_INIT_SKELETON ||
    defaultSkeleton;

  return initSkeleton(skeleton, {
    logger,
    rootPath,
    commandName: 'brunch new',
  });
};

const start = (persistent, arg2, arg3) => {
  const isDebug = hasDebug(arg2) || hasDebug(arg3);
  if (isDebug) {
    let ns = typeof isDebug === 'string' ? isDebug : '*';
    if (ns !== 'speed') ns = `brunch:${ns}`;
    process.env.DEBUG = ns;
  }
  // We require `watch` after we assigned `process.env.DEBUG` any value.
  // Otherwise it would be `undefined` and debug messages wouldn't be shown.
  return require('./watch')(persistent, arg2, arg3);
};

exports.build = start.bind(null, false);
exports.watch = start.bind(null, true);
