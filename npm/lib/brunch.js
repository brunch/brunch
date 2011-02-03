(function() {
  var brunch, fs, glob, path, root, spawn, util, _;
  root = __dirname + "/../";
  util = require('util');
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  _ = require('underscore');
  glob = require('glob');
  brunch = require('brunch');
  exports.VERSION = '0.2.6';
  exports.newProject = function(projectName, options) {
    var directory, directoryLayout, projectTemplatePath, _i, _len;
    exports.options = options;
    projectTemplatePath = path.join(module.id, "/../../template", exports.options.projectTemplate);
    directoryLayout = ["", "config", "config/fusion", "build", "build/web", "build/web/css", "src", "src/app", "src/app/controllers", "src/app/helpers", "src/app/models", "src/app/styles", "src/app/templates", "src/app/views", "src/lib"];
    for (_i = 0, _len = directoryLayout.length; _i < _len; _i++) {
      directory = directoryLayout[_i];
      fs.mkdirSync("brunch/" + directory, 0755);
    }
    fs.linkSync(path.join(projectTemplatePath, "src/app/controllers/MainController.coffee"), "brunch/src/app/controllers/main_controller.coffee");
    fs.linkSync(path.join(projectTemplatePath, "src/app/views/home_view.coffee"), "brunch/src/app/views/home_view.coffee");
    fs.linkSync(path.join(projectTemplatePath, "src/app/templates/home.eco"), "brunch/src/app/templates/home.eco");
    fs.linkSync(path.join(projectTemplatePath, "src/app/main.coffee"), "brunch/src/app/main.coffee");
    fs.linkSync(path.join(projectTemplatePath, "src/app/styles/main.styl"), "brunch/src/app/styles/main.styl");
    fs.linkSync(path.join(projectTemplatePath, "src/app/styles/reset.styl"), "brunch/src/app/styles/reset.styl");
    fs.linkSync(path.join(projectTemplatePath, "config/fusion/options.yaml"), "brunch/config/fusion/options.yaml");
    fs.linkSync(path.join(projectTemplatePath, "config/fusion/hook.js"), "brunch/config/fusion/hook.js");
    fs.linkSync(path.join(projectTemplatePath, "build/index.html"), "brunch/build/index.html");
    fs.linkSync(path.join(projectTemplatePath, "src/vendor"), "brunch/src/vendor");
    if (exports.options.projectTemplate === "express") {
      fs.mkdirSync("brunch/server", 0755);
      fs.linkSync(path.join(projectTemplatePath, "server/main.js"), "brunch/server/main.js");
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
    return exports.spawnStylus();
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
      return exports.spawnStylus();
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
}).call(this);
