'use strict';
require('micro-es7-shim');
require('promise.prototype.finally').shim();

const initSkeleton = require('init-skeleton').init;
const logger = require('loggy');
const BrunchError = require('./utils/error');
const defaultSkeleton = 'https://github.com/brunch/dead-simple';
Object.assign(logger.notifications, {
  app: 'Brunch',
  icon: `${__dirname}/logo.png`,
});

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

exports.new = (rootPath, options) => {
  checkLegacyNewSyntax(options);

  const skeleton = options.skeleton ||
    process.env.BRUNCH_INIT_SKELETON ||
    defaultSkeleton;

  return initSkeleton(skeleton, {
    rootPath,
    logger,
    commandName: 'brunch new',
  });
};

const start = merge => params => {
  let debug = params.debug;
  if (debug) {
    if (typeof debug !== 'string') debug = '*';
    if (debug !== 'speed') debug = `brunch:${debug}`;
    process.env.DEBUG = debug;
  }

  // We require `watch` after we assigned `process.env.DEBUG` any value.
  // Otherwise it would be `undefined` and debug messages wouldn't be shown.
  const watcher = require('./watch');
  const merged = Object.assign({}, params, merge);

  return watcher(merged);
};

exports.build = start({persistent: false});
exports.watch = start({persistent: true});
