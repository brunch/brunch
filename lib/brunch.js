(function() {
  var compilers, createExampleIndex, fileUtil, fs, helpers, path, root;
  root = __dirname + "/../";
  fs = require("fs");
  path = require("path");
  fileUtil = require("file");
  helpers = require("./helpers");
  exports.VERSION = require("./package").version;
  compilers = [];
  exports["new"] = function(options, callback) {
    var templatePath;
    exports.options = options;
    templatePath = path.join(module.id, "/../../template/base");
    return path.exists(exports.options.brunchPath, function(exists) {
      if (exists) {
        helpers.logError("[Brunch]: can't create project;      directory already exists");
        helpers.exit();
      }
      fileUtil.mkdirsSync(exports.options.brunchPath, 0755);
      fileUtil.mkdirsSync(exports.options.buildPath, 0755);
      return helpers.recursiveCopy(templatePath, exports.options.brunchPath, function() {
        var index;
        index = path.join(exports.options.brunchPath, "index.html");
        createExampleIndex(index, exports.options.buildPath);
        callback();
        return helpers.logSuccess("[Brunch]: created brunch directory layout");
      });
    });
  };
  exports.watch = function(options) {
    var opts;
    exports.options = options;
    exports.createBuildDirectories(exports.options.buildPath);
    exports.initializeCompilers();
    opts = {
      path: path.join(exports.options.brunchPath, "src"),
      callOnAdd: true
    };
    return helpers.watchDirectory(opts, exports.dispatch);
  };
  exports.build = function(options) {
    var compiler, _i, _len, _results;
    exports.options = options;
    exports.createBuildDirectories(exports.options.buildPath);
    exports.initializeCompilers();
    _results = [];
    for (_i = 0, _len = compilers.length; _i < _len; _i++) {
      compiler = compilers[_i];
      _results.push(compiler.compile(["."]));
    }
    return _results;
  };
  exports.createExampleIndex = createExampleIndex = function(filePath, buildPath) {
    var brunchPath, cssPath, index, jsPath, relativePath;
    brunchPath = path.join(exports.options.brunchPath, "/");
    if (buildPath.indexOf(brunchPath) === 0) {
      relativePath = buildPath.substr(brunchPath.length);
    } else {
      relativePath = path.join("..", buildPath);
    }
    cssPath = path.join(relativePath, "web/css/main.css");
    jsPath = path.join(relativePath, "web/js/app.js");
    index = "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge,chrome=1\">\n  <link rel=\"stylesheet\" href=\"" + cssPath + "\" type=\"text/css\" media=\"screen\">\n  <script src=\"" + jsPath + "\"></script>\n  <script>require(\"main\");</script>\n</head>\n<body>\n</body>\n</html>";
    return fs.writeFileSync(filePath, index);
  };
  exports.initializeCompilers = function() {
    var compiler, name;
    return compilers = (function() {
      var _ref, _results;
      _ref = require("./compilers");
      _results = [];
      for (name in _ref) {
        compiler = _ref[name];
        _results.push(new compiler(exports.options));
      }
      return _results;
    })();
  };
  exports.createBuildDirectories = function(buildPath) {
    var createDir;
    createDir = function(dirPath) {
      return fileUtil.mkdirsSync(path.join(buildPath, dirPath), 0755);
    };
    createDir("web/js");
    return createDir("web/css");
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
