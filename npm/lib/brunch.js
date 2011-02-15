(function() {
  var brunch, fs, glob, helpers, path, root, spawn, util, _;
  root = __dirname + "/../";
  util = require('util');
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  _ = require('underscore');
  glob = require('glob');
  brunch = require('brunch');
  helpers = require('./helpers');
  exports.VERSION = '0.2.8';
  exports["new"] = function(projectName, options) {
    var projectTemplatePath;
    exports.options = options;
    projectTemplatePath = path.join(module.id, "/../../template", exports.options.projectTemplate);
    fs.mkdirSync("brunch", 0755);
    helpers.copy(path.join(projectTemplatePath, 'src/'), 'brunch/src');
    helpers.copy(path.join(projectTemplatePath, 'build/'), 'brunch/build');
    helpers.copy(path.join(projectTemplatePath, 'config/'), 'brunch/config');
    if (exports.options.projectTemplate === "express") {
      helpers.copy(path.join(projectTemplatePath, 'server/'), 'brunch/server');
    }
    return console.log("created brunch directory layout");
  };
  exports.watch = function(options) {
    var executeServer;
    exports.options = options;
    if (exports.options.projectTemplate === "express") {
      executeServer = spawn('node', ['brunch/server/main.js']);
    }
    fs.watchDir = function(_opts, callback) {
      var addToWatch, opts, watched;
      opts = _.extend({
        path: '.',
        persistent: true,
        interval: 500,
        callOnAdd: false
      }, _opts);
      watched = [];
      addToWatch = function(file) {
        return fs.realpath(file, function(err, filePath) {
          var callOnAdd, isDir;
          callOnAdd = opts.callOnAdd;
          if (!_.include(watched, filePath)) {
            isDir = false;
            watched.push(filePath);
            fs.watchFile(filePath, {
              persistent: opts.persistent,
              interval: opts.interval
            }, function(curr, prev) {
              if (curr.mtime.getTime() === prev.mtime.getTime()) {
                return;
              }
              if (isDir) {
                return addToWatch(filePath);
              } else {
                return callback(filePath);
              }
            });
          } else {
            callOnAdd = false;
          }
          return fs.stat(filePath, function(err, stats) {
            if (stats.isDirectory()) {
              isDir = true;
              return fs.readdir(filePath, function(err, files) {
                return process.nextTick(function() {
                  var file, _i, _len, _results;
                  _results = [];
                  for (_i = 0, _len = files.length; _i < _len; _i++) {
                    file = files[_i];
                    _results.push(addToWatch(filePath + '/' + file));
                  }
                  return _results;
                });
              });
            } else {
              if (callOnAdd) {
                return callback(filePath);
              }
            }
          });
        });
      };
      return addToWatch(opts.path);
    };
    return fs.watchDir({
      path: 'brunch',
      callOnAdd: true
    }, function(file) {
      return exports.dispatch(file);
    });
  };
  exports.build = function() {
    var sourcePaths;
    sourcePaths = exports.generateSourcePaths();
    exports.spawnCoffee(sourcePaths);
    exports.spawnDocco(sourcePaths);
    exports.spawnFusion();
    exports.spawnStylus();
    return exports.copyJsFiles();
  };
  exports.dispatch = function(file) {
    var sourcePaths, templateExtensionRegex;
    console.log('file: ' + file);
    if (file.match(/coffee$/)) {
      sourcePaths = exports.generateSourcePaths();
      exports.spawnCoffee(sourcePaths);
      exports.spawnDocco(sourcePaths);
    }
    templateExtensionRegex = new RegExp("" + exports.options.templateExtension + "$");
    if (file.match(templateExtensionRegex)) {
      exports.spawnFusion();
    }
    if (file.match(/styl$/)) {
      exports.spawnStylus();
    }
    if (file.match(/^brunch\/src\/.*js$/)) {
      return exports.copyJsFile(file);
    }
  };
  exports.generateSourcePaths = function() {
    var appSource, appSources, globbedPaths, sourcePaths, _i, _len;
    appSources = ['brunch/src/app/helpers/*.coffee', 'brunch/src/app/models/*.coffee', 'brunch/src/app/collections/*.coffee', 'brunch/src/app/controllers/*.coffee', 'brunch/src/app/views/*.coffee'];
    sourcePaths = [];
    for (_i = 0, _len = appSources.length; _i < _len; _i++) {
      appSource = appSources[_i];
      globbedPaths = glob.globSync(appSource, 0);
      sourcePaths = sourcePaths.concat(globbedPaths);
    }
    sourcePaths.unshift('brunch/src/app/main.coffee');
    return sourcePaths;
  };
  exports.spawnCoffee = function(sourcePaths) {
    var coffeeParams, executeCoffee;
    coffeeParams = ['--output', 'brunch/build/web/js', '--join', '--lint', '--compile'];
    coffeeParams = coffeeParams.concat(sourcePaths);
    executeCoffee = spawn('coffee', coffeeParams);
    executeCoffee.stderr.on('data', function(data) {
      return util.log(data);
    });
    return executeCoffee.on('exit', function(code) {
      if (code === 0) {
        return util.log('compiled .coffee to .js');
      } else {
        return util.log('there was a problem during .coffee to .js compilation. see above');
      }
    });
  };
  exports.spawnDocco = function(sourcePaths) {
    var executeDocco;
    executeDocco = spawn('docco', sourcePaths);
    return executeDocco.stderr.on('data', function(data) {
      return util.log(data);
    });
  };
  exports.spawnFusion = function() {
    var executeFusion;
    executeFusion = spawn('fusion', ['--config', 'brunch/config/fusion/options.yaml', 'brunch/src/app/templates']);
    return executeFusion.stdout.on('data', function(data) {
      return util.log(data);
    });
  };
  exports.spawnStylus = function() {
    var executeStylus;
    executeStylus = spawn('stylus', ['--compress', '--out', 'brunch/build/web/css', 'brunch/src/app/styles/main.styl']);
    return executeStylus.stdout.on('data', function(data) {
      return util.log('compiling .style to .css:\n' + data);
    });
  };
  exports.copyJsFile = function(file) {
    var newLocation;
    newLocation = file.replace('brunch/src', 'brunch/build/web/js');
    helpers.mkdirsForFile(newLocation, 0755);
    return helpers.copy(file, newLocation);
  };
  exports.copyJsFiles = function() {
    return helpers.getFilesInTree('brunch/src', function(err, files) {
      var file, _i, _len;
      if (err) {
        console.log(err);
      }
      for (_i = 0, _len = files.length; _i < _len; _i++) {
        file = files[_i];
        exports.copyJsFile(file);
      }
      return util.log('copied .js files to build folder');
    });
  };
}).call(this);
