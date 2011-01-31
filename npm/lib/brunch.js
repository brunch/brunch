(function() {
  var fs, glob, path, root, spawn, util, _;
  root = __dirname + "/../";
  util = require('util');
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  _ = require('underscore');
  glob = require('glob');
  exports.VERSION = '0.1.6';
  exports.run = function(settings) {
    exports.settings = settings;
    if (exports.settings.watch) {
      return exports.watch();
    }
  };
  exports.newProject = function(projectName) {
    var compassParams, directory, directory_layout, execute_compass, fusion_config, fusion_hook, main_content, _i, _len;
    directory_layout = ["", "config", "config/compass", "config/fusion", "build", "build/web", "src", "src/app", "src/app/controllers", "src/app/models", "src/app/templates", "src/app/helpers", "src/app/views", "src/lib", "src/vendor", "src/stylesheets"];
    for (_i = 0, _len = directory_layout.length; _i < _len; _i++) {
      directory = directory_layout[_i];
      fs.mkdirSync("brunch/" + directory, 0755);
    }
    main_content = "window." + projectName + " = {}\n" + projectName + ".controllers = {}\n" + projectName + ".models = {}\n" + projectName + ".views = {}\n\n# app bootstrapping on document ready\n$(document).ready ->\n  if window.location.hash == ''\n    window.location.hash = 'home'\n  Backbone.history.start()";
    fs.writeFileSync("brunch/src/app/main.coffee", main_content);
    fusion_config = "hook: \"brunch/config/fusion/hooks.js\"";
    fs.writeFileSync("brunch/config/fusion/settings.yaml", fusion_config);
    fusion_hook = "var eco = require('eco');\nexports.compileTemplate = function(content) {\n   return eco.compile(content);\n};";
    fs.writeFileSync("brunch/config/fusion/hook.js", fusion_hook);
    console.log("created brunch directory layout");
    compassParams = ['create', 'brunch/config/compass', '--syntax=sass', '--using=blueprint/semantic', '--sass-dir=../../src/stylesheets', '--css-dir=../../build/web/css', '--images-dir=../../build/web/img', '--javascripts-dir=../../build/web/js'];
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
    var app_source, app_sources, coffeeParams, executeDocco, execute_coffee, execute_compass, execute_fusion, globbedPaths, source_paths, _i, _len;
    console.log('file: ' + file);
    if (file.match(/coffee$/)) {
      app_sources = ['brunch/src/app/helpers/*.coffee', 'brunch/src/app/models/*.coffee', 'brunch/src/app/collections/*.coffee', 'brunch/src/app/controllers/*.coffee', 'brunch/src/app/views/*.coffee'];
      source_paths = [];
      for (_i = 0, _len = app_sources.length; _i < _len; _i++) {
        app_source = app_sources[_i];
        globbedPaths = glob.globSync(app_source, 0);
        source_paths = source_paths.concat(globbedPaths);
      }
      source_paths.push('brunch/src/app/main.coffee');
      coffeeParams = ['--output', 'brunch/build/web/js', '--join', '--lint', '--compile'];
      coffeeParams = coffeeParams.concat(source_paths);
      execute_coffee = spawn('coffee', coffeeParams);
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
      globbedPaths = glob.globSync('brunch/src/app/*.coffee', 0);
      executeDocco = spawn('docco', globbedPaths);
      executeDocco.stderr.on('data', function(data) {
        return util.log(data);
      });
    }
    if (file.match(/html$/) || file.match(/jst$/)) {
      console.log('fusion');
      execute_fusion = spawn('fusion', ['--settings', 'brunch/config/fusion/settings.yaml', '--output', 'brunch/build/web/js/templates.js', 'brunch/src/app/templates']);
      execute_fusion.stdout.on('data', function(data) {
        return util.log(data);
      });
    }
    if (file.match(/sass$/)) {
      execute_compass = spawn('compass', ['compile', '--config', 'brunch/config/compass/config.rb', 'brunch/config/compass/']);
      return execute_compass.stdout.on('data', function(data) {
        return util.log('compiling .sass to .css:\n' + data);
      });
    }
  };
}).call(this);
