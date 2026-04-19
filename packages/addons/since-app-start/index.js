'use strict';

const startTime = global[Symbol.for('start-time')] || Date.now();
const profilings = Object.create(null);
const debug = require('debug')('speed');

const addEntry = name => {
  const ms = Date.now() - startTime;
  profilings[name] = ms;
  return `${name} ${ms} ms`;
};

module.exports = {
  profilings,
  addEntry,
  profile(name) {
    return debug(addEntry(name));
  },
  get sinceStart() {
    return Date.now() - startTime;
  }
};
