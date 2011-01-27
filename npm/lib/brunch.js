(function() {
  var fs, path, root, spawn, util, watcher, _;
  root = __dirname + "/../";
  util = require('util');
  fs = require('fs');
  path = require('path');
  watcher = require('watch');
  spawn = require('child_process').spawn;
  _ = require('underscore');
  exports.VERSION = '0.1.0';
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
    return watcher.createMonitor('brunch', {
      interval: 10
    }, function(monitor) {
      monitor.on("changed", function(file) {
        return exports.dispatch(file);
      });
      monitor.on("created", function(file) {
        return exports.dispatch(file);
      });
      return monitor.on("removed", function(file) {
        return exports.dispatch(file);
      });
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
