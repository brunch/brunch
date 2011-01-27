(function() {
  var fs, path, root, spawn, util, _;
  root = __dirname + "/../";
  util = require('util');
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  _ = require('underscore');
  exports.VERSION = '0.1.1';
  exports.run = function(settings) {
    exports.settings = settings;
    if (exports.settings.watch) {
      return exports.watch();
    }
  };
  exports.newProject = function(projectName) {
    var compassParams, directory, directory_layout, execute_compass, main_content, _i, _len;
    directory_layout = ["", "config", "config/compass", "build", "build/web", "src", "src/app", "src/controllers", "src/lib", "src/models", "src/templates", "src/vendor", "src/views", "src/stylesheets"];
    for (_i = 0, _len = directory_layout.length; _i < _len; _i++) {
      directory = directory_layout[_i];
      fs.mkdirSync("brunch/" + directory, 0755);
    }
    main_content = "window." + projectName + " = {}\n" + projectName + ".controllers = {}\n" + projectName + ".models = {}\n" + projectName + ".views = {}\n" + projectName + ".app = {}\n\n# app bootstrapping on document ready\n$(document).ready ->\n  if window.location.hash == ''\n    window.location.hash = 'home'\n  Backbone.history.start()";
    fs.writeFileSync("brunch/src/app/main.coffee", main_content);
    console.log("created brunch directory layout");
    compassParams = ['create', 'brunch/config/compass', '--syntax=sass', '--using=blueprint/semantic', '--sass-dir=../../src/stylesheets', '--css-dir=../../build/stylesheets', '--images-dir=../../build/images', '--javascripts-dir=../../build/javascript'];
    execute_compass = spawn('compass', compassParams);
    return console.log("added compass setup");
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
    var execute_coffee, execute_compass, execute_fusion;
    console.log('file: ' + file);
    if (file.match(/coffee$/)) {
      execute_coffee = spawn('coffee', ['--lint', '--output', 'brunch/build/web', 'brunch/src/']);
      execute_coffee.stderr.on('data', function(data) {
        return util.log(data);
      });
      execute_coffee.on('exit', function(code) {
        if (code === 0) {
          return util.log('compiled .coffee to .js');
        } else {
          return util.log('there was a problem during .coffee to .js compilation. see above');
        }
      });
    }
    if (file.match(/html$/) || file.match(/jst$/)) {
      console.log('fusion');
      execute_fusion = spawn('fusion', ['--output', 'brunch/build/web/app/templates.js', 'brunch/src/templates']);
      execute_fusion.stdout.on('data', function(data) {
        return util.log(data);
      });
    }
    if (file.match(/sass$/)) {
      execute_compass = spawn('compass', ['compile', '--config', 'brunch/config/compass/config.rb', 'brunch/config/compass/']);
      return execute_compass.stdout.on('data', function(data) {
        return console.log('compiling .sass to .css:\n' + data);
      });
    }
  };
}).call(this);
