'use strict';

const debug = require('debug')('brunch:speed');
const startTime = 'brunchStartTime' in global ?
  global.brunchStartTime :
  Date.now();
const profilings = {};

exports.sinceStart = () => Date.now() - startTime;

exports.addEntry = (name) => {
  const ms = exports.sinceStart();
  profilings[name] = ms;
  return name + ' ' + ms + 'ms';
};

exports.profile = (name) => debug(exports.addEntry(name));
