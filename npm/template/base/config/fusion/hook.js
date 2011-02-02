var eco = require('eco');
exports.compileTemplate = function(content) {
  return eco.compile(content);
};