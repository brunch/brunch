(function() {
  var compilers, fileUtil, fs, helpers, path, _;
  _ = require("underscore");
  fs = require("fs");
  path = require("path");
  fileUtil = require("file");
  helpers = require("./helpers");
  exports.VERSION = require("./package").version;
  compilers = [];
  exports["new"] = function(rootPath, callback) {
    var templatePath;
    templatePath = path.join(module.id, "/../../template/base");
    return path.exists(rootPath, function(exists) {
      if (exists) {
        helpers.logError("[Brunch]: can't create project;      directory already exists");
        helpers.exit();
      }
      fileUtil.mkdirsSync(rootPath, 0755);
      return helpers.recursiveCopy(templatePath, rootPath, function() {
        var index;
        index = path.join(rootPath, "index.html");
        exports.createExampleIndex(index, callback);
        return helpers.logSuccess("[Brunch]: created brunch directory layout");
      });
    });
  };
  exports.watch = function(rootPath, options) {
    var opts;
    exports.initializeCompilers(rootPath, options);
    opts = {
      path: path.join(rootPath, "src"),
      callOnAdd: true
    };
    return helpers.watchDirectory(opts, exports.dispatch);
  };
  exports.build = function(rootPath, options) {
    var compiler, _i, _len, _results;
    exports.initializeCompilers(rootPath, options);
    _results = [];
    for (_i = 0, _len = compilers.length; _i < _len; _i++) {
      compiler = compilers[_i];
      _results.push(compiler.compile(["."]));
    }
    return _results;
  };
  exports.createExampleIndex = function(filePath, callback) {
    var index;
    index = "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge,chrome=1\">\n  <link rel=\"stylesheet\" href=\"build/web/css/main.css\" type=\"text/css\" media=\"screen\">\n  <script src=\"build/web/js/app.js\"></script>\n  <script>require('main');</script>\n</head>\n<body>\n</body>\n</html>";
    return fs.writeFile(filePath, index, callback);
  };
  exports.initializeCompilers = function(rootPath, options) {
    var compiler, name, settings;
    return compilers = (function() {
      var _results;
      _results = [];
      for (name in options) {
        settings = options[name];
        compiler = require('./compilers')["" + (helpers.capitalize(name)) + "Compiler"];
        _results.push(new compiler(rootPath, settings));
      }
      return _results;
    })();
  };
  exports.dispatch = function(file) {
    var compiler, _i, _len;
    for (_i = 0, _len = compilers.length; _i < _len; _i++) {
      compiler = compilers[_i];
      if (compiler.matchesFile(file)) {
        return compiler.onFileChanged(file);
      }
    }
  };
}).call(this);
