var eco = require('./vendor/eco/eco');
var fusion = require('fusion');
exports.createTemplateObject = function(content, source, directoryPrefix) {
  return eco.compile(content, { identifier: fusion.templateNamespace(source, directoryPrefix)});
};
