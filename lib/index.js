'use strict';
require('micro-es7-shim');
const logger = require('loggy');
const isOldBrunchNewSyntax = options => {
  const rawArgs = options.parent.rawArgs;
  const newIdx = rawArgs.indexOf('new');
  const opts = rawArgs.slice(newIdx + 1);
  const oldSyntax = !options.skeleton && opts.length === 2;
  if (!oldSyntax) return false;

  const skeleton = opts[0];
  const path = opts[1];
  logger.error(`The 'brunch new ${skeleton} ${path}' syntax is no longer supported. Use 'brunch new ${path} -s ${skeleton}'`);
  return true;
};

const hasDebug = obj => {
  return obj && typeof obj === 'object' && obj.debug;
};

exports.defaultSkeleton = 'https://github.com/brunch/dead-simple';
exports.new = (rootPath, options) => {
  if (isOldBrunchNewSyntax(options)) process.exit(1);

  const initSkeleton = require('init-skeleton').init;
  const skeleton = options.skeleton ||
    process.env.BRUNCH_INIT_SKELETON || exports.defaultSkeleton;
  return initSkeleton(skeleton, {
    logger,
    rootPath,
    commandName: 'brunch new',
  });
};

const start = (persistent, arg2, arg3) => {
  const watch = require('./watch');
  const isDebug = hasDebug(arg2) || hasDebug(arg3);
  if (isDebug) {
    let ns = typeof isDebug === 'string' ? isDebug : '*';
    if (ns !== 'speed') ns = `brunch:${ns}`;
    process.env.DEBUG = ns;
  }
  return watch(persistent, arg2, arg3);
};

exports.build = start.bind(null, false);
exports.watch = start.bind(null, true);
