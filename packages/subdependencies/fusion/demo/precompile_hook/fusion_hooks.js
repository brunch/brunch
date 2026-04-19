var eco = require('./eco/eco');
var fusion = require('./../../lib/fusion');
exports.createTemplateObject = function(content, source, directoryPrefix) {
  return eco.compile(content, { identifier: fusion.templateNamespace(source, directoryPrefix)});
};
