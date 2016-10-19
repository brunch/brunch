'use strict';

const promisifyHook = require('./utils').promisifyHook;
module.exports = plugin => {
  // Backwards compatibility for legacy optimizers.
  if (typeof plugin.minify === 'function') {
    if (!plugin.optimize) plugin.optimize = plugin.minify;
  }

  // Assume plugin is meant for any env.
  if (!plugin.defaultEnv) plugin.defaultEnv = '*';

  // Normalize includes to an array.'
  if (typeof plugin.include === 'function') {
    plugin.include = plugin.include();
  } else if (plugin.include == null) {
    plugin.include = [];
  }

  promisifyHook(plugin);

  return plugin;
};
