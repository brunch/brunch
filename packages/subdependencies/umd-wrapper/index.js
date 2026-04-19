module.exports = function(data) {
  return "var __templateData = " + data + ";\nif (typeof define === 'function' && define.amd) {\n  define([], function() {\n    return __templateData;\n  });\n} else if (typeof module === 'object' && module && module.exports) {\n  module.exports = __templateData;\n} else {\n  __templateData;\n}";
}
