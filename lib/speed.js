var debug = require('debug')('brunch:speed');
var startTime = global.brunchStartTime || Date.now();
var profilings = {};

exports.sinceStart = function() {
  return Date.now() - startTime;
};

exports.addEntry = function(name) {
  var ms = exports.sinceStart();
  profilings[name] = ms;
  return name + ' ' + ms + 'ms';
};

exports.profile = function(name) {
  return debug(exports.addEntry(name));
};
