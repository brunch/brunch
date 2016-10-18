'use strict';

module.exports = plugin => {
  // Backwards compatibility for legacy optimizers.
  if (typeof plugin.minify === 'function') {
    if (!plugin.optimize) plugin.optimize = plugin.minify;
  }

  return plugin;
};
