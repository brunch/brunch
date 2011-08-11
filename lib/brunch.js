(function() {
  var colors, compilers, fileUtil, fs, helpers, path, root;
  root = __dirname + "/../";
  fs = require('fs');
  path = require('path');
  helpers = require('./helpers');
  fileUtil = require('file');
  colors = require('../vendor/termcolors').colors;
  exports.VERSION = require('./package').version;
  compilers = [];
  exports["new"] = function(options, callback) {
    var templatePath;
    exports.options = options;
    templatePath = path.join(module.id, "/../../template/base");
    return path.exists(exports.options.brunchPath, function(exists) {
      if (exists) {
        helpers.log(colors.lred("brunch:   directory already exists - can't create a project in there\n", true));
        process.exit(0);
      }
      fileUtil.mkdirsSync(exports.options.brunchPath, 0755);
      fileUtil.mkdirsSync(exports.options.buildPath, 0755);
      return helpers.recursiveCopy(templatePath, exports.options.brunchPath, function() {
        exports.createExampleIndex(path.join(exports.options.brunchPath, 'index.html'), exports.options.buildPath);
        callback();
        return helpers.log("brunch:   " + (colors.green('created ', true)) + " brunch directory layout\n");
      });
    });
  };
  exports.watch = function(options) {
    exports.options = options;
    exports.createBuildDirectories(exports.options.buildPath);
    exports.initializeCompilers();
    return helpers.watchDirectory({
      path: path.join(exports.options.brunchPath, 'src'),
      callOnAdd: true
    }, function(file) {
      return exports.dispatch(file);
    });
  };
  exports.build = function(options) {
    var compiler, _i, _len, _results;
    exports.options = options;
    exports.createBuildDirectories(exports.options.buildPath);
    exports.initializeCompilers();
    _results = [];
    for (_i = 0, _len = compilers.length; _i < _len; _i++) {
      compiler = compilers[_i];
      _results.push(compiler.compile(['.']));
    }
    return _results;
  };
  exports.createExampleIndex = function(filePath, buildPath) {
    var brunchPath, index, relativePath;
    brunchPath = path.join(exports.options.brunchPath, '/');
    if (buildPath.indexOf(brunchPath) === 0) {
      relativePath = buildPath.substr(brunchPath.length);
    } else {
      relativePath = path.join('..', buildPath);
    }
    index = "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge,chrome=1\">\n  <link rel=\"stylesheet\" href=\"" + (path.join(relativePath, 'web/css/main.css')) + "\" type=\"text/css\" media=\"screen\">\n  <script src=\"" + (path.join(relativePath, 'web/js/app.js')) + "\"></script>\n  <script>require('main');</script>\n</head>\n<body>\n</body>\n</html>";
    return fs.writeFileSync(filePath, index);
  };
  exports.initializeCompilers = function() {
    var compiler, name;
    return compilers = (function() {
      var _ref, _results;
      _ref = require('./compilers');
      _results = [];
      for (name in _ref) {
        compiler = _ref[name];
        _results.push(new compiler(exports.options));
      }
      return _results;
    })();
  };
  exports.createBuildDirectories = function(buildPath) {
    fileUtil.mkdirsSync(path.join(buildPath, 'web/js'), 0755);
    return fileUtil.mkdirsSync(path.join(buildPath, 'web/css'), 0755);
  };
  exports.dispatch = function(file) {
    var compiler, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = compilers.length; _i < _len; _i++) {
      compiler = compilers[_i];
      _results.push(compiler.matchesFile(file) ? compiler.fileChanged(file) : void 0);
    }
    return _results;
  };
}).call(this);
