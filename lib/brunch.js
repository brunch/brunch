(function() {
  var colors, compilers, expressProcess, fileUtil, helpers, path, root, spawn;
  root = __dirname + "/../";
  path = require('path');
  spawn = require('child_process').spawn;
  helpers = require('./helpers');
  fileUtil = require('file');
  colors = require('../vendor/termcolors').colors;
  exports.VERSION = '0.7.2';
  expressProcess = {};
  compilers = [];
  exports["new"] = function(options, callback) {
    var projectTemplatePath;
    exports.options = options;
    projectTemplatePath = path.join(module.id, "/../../template", exports.options.projectTemplate);
    return path.exists(exports.options.brunchPath, function(exists) {
      if (exists) {
        helpers.log(colors.lred("brunch:   directory already exists - can't create a project in there\n", true));
        process.exit(0);
      }
      fileUtil.mkdirsSync(exports.options.brunchPath, 0755);
      fileUtil.mkdirsSync(exports.options.buildPath, 0755);
      return helpers.recursiveCopy(projectTemplatePath, exports.options.brunchPath, function() {
        return helpers.recursiveCopy(path.join(projectTemplatePath, 'build/'), exports.options.buildPath, function() {
          callback();
          return helpers.log("brunch:   " + (colors.green('created', true)) + " brunch directory layout\n");
        });
      });
    });
  };
  exports.watch = function(options) {
    exports.options = options;
    exports.createBuildDirectories(exports.options.buildPath);
    exports.initializeCompilers();
    path.exists(path.join(exports.options.brunchPath, 'server/main.js'), function(exists) {
      if (exists) {
        helpers.log("express:  application started on port " + (colors.blue(exports.options.expressPort, true)) + ": http://0.0.0.0:" + exports.options.expressPort + "\n");
        expressProcess = spawn('node', [path.join(exports.options.brunchPath, 'server/main.js'), exports.options.expressPort, exports.options.brunchPath]);
        return expressProcess.stderr.on('data', function(data) {
          return helpers.log(colors.lred('express err: ' + data));
        });
      }
    });
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
  exports.stop = function() {
    if (expressProcess !== {}) {
      return expressProcess.kill('SIGHUP');
    }
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
      if (compiler.matchesFile(file)) {
        compiler.fileChanged(file);
        break;
      }
    }
    return _results;
  };
}).call(this);
