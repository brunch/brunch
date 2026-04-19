global.expect = require('chai').expect;
global.Plugin = require('./');
describe('Plugin', function() {
  var plugin;

  beforeEach(function() {
    plugin = new Plugin({});
  });

  it('should be an object', function() {
    expect(plugin).to.be.ok;
  });

  it('should has #compile method', function() {
    expect(plugin.compile).to.be.an.instanceof(Function);
  });

  it('should compile and produce valid result', function(done) {
    var content = '<strong></strong>';
    var expected = "var __templateData = function (__obj) {\n  if (!__obj) __obj = {};\n  var __out = [], __capture = function(callback) {\n    var out = __out, result;\n    __out = [];\n    callback.call(this);\n    result = __out.join('');\n    __out = out;\n    return __safe(result);\n  }, __sanitize = function(value) {\n    if (value && value.ecoSafe) {\n      return value;\n    } else if (typeof value !== 'undefined' && value != null) {\n      return __escape(value);\n    } else {\n      return '';\n    }\n  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;\n  __safe = __obj.safe = function(value) {\n    if (value && value.ecoSafe) {\n      return value;\n    } else {\n      if (!(typeof value !== 'undefined' && value != null)) value = '';\n      var result = new String(value);\n      result.ecoSafe = true;\n      return result;\n    }\n  };\n  if (!__escape) {\n    __escape = __obj.escape = function(value) {\n      return ('' + value)\n        .replace(/&/g, '&amp;')\n        .replace(/</g, '&lt;')\n        .replace(/>/g, '&gt;')\n        .replace(/\"/g, '&quot;');\n    };\n  }\n  (function() {\n    (function() {\n      __out.push('<strong></strong>');\n    \n    }).call(this);\n    \n  }).call(__obj);\n  __obj.safe = __objSafe, __obj.escape = __escape;\n  return __out.join('');\n};\nif (typeof define === 'function' && define.amd) {\n  define([], function() {\n    return __templateData;\n  });\n} else if (typeof module === 'object' && module && module.exports) {\n  module.exports = __templateData;\n} else {\n  __templateData;\n}";


    plugin.compile({data: content, path: 'template.eco'}).then(data => {
      expect(data).to.equal(expected)
      done();
    }, error => expect(error).not.to.be.ok);
  });
});
