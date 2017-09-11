'use strict';
const legacy = require('./legacy');
const modern = require('./modern');

module.exports = plugin => {
  legacy(plugin);
  modern(plugin);

  return plugin;
};
