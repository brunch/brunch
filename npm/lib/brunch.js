(function() {
  var fs, glob, path, root, spawn, util, _;
  root = __dirname + "/../";
  util = require('util');
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  _ = require('underscore');
  glob = require('glob');
  exports.VERSION = '0.2.3';
  exports.run = function(settings) {
    exports.settings = settings;
    if (exports.settings.watch) {
      return exports.watch();
    }
  };
  exports.newProject = function(projectName) {
    var directory, directoryLayout, fusionConfig, fusionHook, indexHtml, mainContent, _i, _len;
    directoryLayout = ["", "config", "config/fusion", "build", "build/web", "src", "src/app", "src/app/controllers", "src/app/helpers", "src/app/models", "src/app/styles", "src/app/templates", "src/app/views", "src/lib", "src/vendor"];
    for (_i = 0, _len = directoryLayout.length; _i < _len; _i++) {
      directory = directoryLayout[_i];
      fs.mkdirSync("brunch/" + directory, 0755);
    }
    mainContent = "window." + projectName + " = {}\n" + projectName + ".controllers = {}\n" + projectName + ".models = {}\n" + projectName + ".views = {}\n\n# app bootstrapping on document ready\n$(document).ready ->\n  Backbone.history.saveLocation(\"!/home\") if '' == Backbone.history.getFragment()\n  Backbone.history.start()";
    fs.writeFileSync("brunch/src/app/main.coffee", mainContent);
    fusionConfig = "hook: \"brunch/config/fusion/hook.js\"";
    fs.writeFileSync("brunch/config/fusion/settings.yaml", fusionConfig);
    fusionHook = "var eco = require('eco');\nexports.compileTemplate = function(content) {\n  return eco.compile(content);\n};";
    fs.writeFileSync("brunch/config/fusion/hook.js", fusionHook);
    indexHtml = "<!doctype html>\n<html lang=\"en\">\n<head>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>";
    fs.writeFileSync("brunch/build/index.html", indexHtml);
    return console.log("created brunch directory layout");
  };
  exports.watch = function() {
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
  exports.dispatch = function(file) {
    var appSource, appSources, coffeeParams, executeCoffee, executeDocco, executeFusion, executeStylus, globbedPaths, sourcePaths, _i, _len;
    console.log('file: ' + file);
    if (file.match(/coffee$/)) {
      appSources = ['brunch/src/app/helpers/*.coffee', 'brunch/src/app/models/*.coffee', 'brunch/src/app/collections/*.coffee', 'brunch/src/app/controllers/*.coffee', 'brunch/src/app/views/*.coffee'];
      sourcePaths = [];
      for (_i = 0, _len = appSources.length; _i < _len; _i++) {
        appSource = appSources[_i];
        globbedPaths = glob.globSync(appSource, 0);
        sourcePaths = sourcePaths.concat(globbedPaths);
      }
      sourcePaths.push('brunch/src/app/main.coffee');
      coffeeParams = ['--output', 'brunch/build/web/js', '--join', '--lint', '--compile'];
      coffeeParams = coffeeParams.concat(sourcePaths);
      executeCoffee = spawn('coffee', coffeeParams);
      executeCoffee.stderr.on('data', function(data) {
        return util.log(data);
      });
      executeCoffee.on('exit', function(code) {
        if (code === 0) {
          return util.log('compiled .coffee to .js');
        } else {
          return util.log('there was a problem during .coffee to .js compilation. see above');
        }
      });
      globbedPaths = glob.globSync('brunch/src/app/*.coffee', 0);
      executeDocco = spawn('docco', globbedPaths);
      executeDocco.stderr.on('data', function(data) {
        return util.log(data);
      });
    }
    if (file.match(/html$/) || file.match(/jst$/)) {
      console.log('fusion');
      executeFusion = spawn('fusion', ['--hook', 'brunch/config/fusion/hook.js', '--output', 'brunch/build/web/js/templates.js', 'brunch/src/app/templates']);
      executeFusion.stdout.on('data', function(data) {
        return util.log(data);
      });
    }
    if (file.match(/style$/)) {
      console.log('style');
      executeStylus = spawn('stylus', ['--compress', '<', 'brunch/src/app/styles/main.style', '>', 'brunch/build/web/css/main.css']);
      return executeStylus.stdout.on('data', function(data) {
        return util.log('compiling .style to .css:\n' + data);
      });
    }
  };
}).call(this);
