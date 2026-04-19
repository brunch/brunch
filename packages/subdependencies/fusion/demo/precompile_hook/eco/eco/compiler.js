(function() {
  var CoffeeScript, compile, eco, indent, preprocess;
  CoffeeScript = require("coffee-script");
  preprocess = require("./preprocessor").preprocess;
  indent = require("./util").indent;
  module.exports = eco = function(source) {
    var module;
    (new Function("module", compile(source)))(module = {});
    return module.exports;
  };
  eco.preprocess = preprocess;
  eco.compile = compile = function(source, options) {
    var identifier, script, _ref;
    identifier = (_ref = options != null ? options.identifier : void 0) != null ? _ref : "module.exports";
    if (!identifier.match(/\./)) {
      identifier = "var " + identifier;
    }
    script = CoffeeScript.compile(preprocess(source), {
      noWrap: true
    });
    return "" + identifier + " = function(__obj) {\n  if (!__obj) __obj = {};\n  var __out = [], __capture = function(callback) {\n    var out = __out, result;\n    __out = [];\n    callback.call(this);\n    result = __out.join('');\n    __out = out;\n    return __safe(result);\n  }, __sanitize = function(value) {\n    if (value && value.ecoSafe) {\n      return value;\n    } else if (typeof value !== 'undefined' && value != null) {\n      return __escape(value);\n    } else {\n      return '';\n    }\n  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;\n  __safe = __obj.safe = function(value) {\n    if (value && value.ecoSafe) {\n      return value;\n    } else {\n      if (!(typeof value !== 'undefined' && value != null)) value = '';\n      var result = new String(value);\n      result.ecoSafe = true;\n      return result;\n    }\n  };\n  if (!__escape) {\n    __escape = __obj.escape = function(value) {\n      return ('' + value)\n        .replace(/&/g, '&amp;')\n        .replace(/</g, '&lt;')\n        .replace(/>/g, '&gt;')\n        .replace(/\x22/g, '&quot;');\n    };\n  }\n  (function() {\n" + (indent(script, 4)) + "\n  }).call(__obj);\n  __obj.safe = __objSafe, __obj.escape = __escape;\n  return __out.join('');\n};";
  };
  eco.render = function(source, data) {
    return (eco(source))(data);
  };
  if (require.extensions) {
    require.extensions[".eco"] = function(module, filename) {
      var source;
      source = require("fs").readFileSync(filename, "utf-8");
      return module._compile(compile(source), filename);
    };
  } else if (require.registerExtension) {
    require.registerExtension(".eco", compile);
  }
}).call(this);
