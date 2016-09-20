'use strict';
require('micro-es7-shim');
const loggy = require('loggy');

exports.defaultSkeleton = 'https://github.com/brunch/dead-simple';

exports.new = (path, options) => {
  const checkOldBrunchNewSyntax = options => {
    const rawArgs = options.parent.rawArgs;
    const newIdx = rawArgs.indexOf('new');
    const opts = rawArgs.slice(newIdx + 1);
    const oldSyntax = !options.skeleton && opts.length === 2;

    if (oldSyntax) {
      const skeleton = opts[0];
      const path = opts[1];
      loggy.error(`The 'brunch new ${skeleton} ${path}' syntax is no longer supported. Use 'brunch new ${path} -s ${skeleton}'`);
      return true;
    }
  };

  if (checkOldBrunchNewSyntax(options)) return process.exit();

  const initSkeleton = require('init-skeleton').init;
  const skeleton = options.skeleton ||
    process.env.BRUNCH_INIT_SKELETON || exports.defaultSkeleton;
  return initSkeleton(skeleton, {
    rootPath: path,
    commandName: 'brunch new',
    logger: loggy,
  });
};

const start = (persistent, arg2, arg3) => {
  const hasDebug = obj => {
    return obj && typeof obj === 'object' && obj.debug;
  };

  const isDebug = hasDebug(arg2) || hasDebug(arg3);
  if (isDebug) {
    let ns = typeof isDebug === 'string' ? isDebug : '*';
    if (ns !== 'speed') ns = `brunch:${ns}`;
    process.env.DEBUG = ns;
  }
  const fn = require('./watch');
  return fn(persistent, arg2, arg3);
};

exports.build = start.bind(null, false);
exports.watch = start.bind(null, true);
