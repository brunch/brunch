(function() {
  var fs, path, root, spawn, util, watcher, _;
  root = __dirname + "/../";
  util = require('util');
  fs = require('fs');
  path = require('path');
  watcher = require('watch');
  spawn = require('child_process').spawn;
  _ = require('underscore');
  exports.VERSION = '0.0.7';
  exports.run = function(settings) {
    exports.settings = settings;
    if (exports.settings.watch) {
      return exports.watch();
    }
  };
  exports.newProject = function(projectName) {
    var compass_content, directory, directory_layout, main_content, _i, _len;
    directory_layout = ["", "build", "build/web", "src", "src/app", "src/config", "src/controllers", "src/lib", "src/models", "src/templates", "src/vendor", "src/views", "src/stylesheets"];
    for (_i = 0, _len = directory_layout.length; _i < _len; _i++) {
      directory = directory_layout[_i];
      fs.mkdirSync("brunch/" + directory, 0755);
    }
    app_name = 'br';
    main_content = "window." + app_name + " = {}\n" + app_name + ".controllers = {}\n" + app_name + ".models = {}\n" + app_name + ".views = {}\n" + app_name + ".app = {}\n\n# app bootstrapping on document ready\n$(document).ready ->\n  if window.location.hash == ''\n    window.location.hash = 'home'\n  Backbone.history.start()";
    fs.writeFileSync("brunch/src/app/main.coffee", main_content);
    return console.log("created brunch directory layout");
  };
  exports.watch = function() {
    return watcher.createMonitor(exports.settings.input_dir, {
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
    var execute_coffee, execute_fusion;
    console.log('file: ' + file);
    if (file.match(/coffee$/)) {
      execute_coffee = spawn('coffee', ['--lint', '--output', exports.settings.output_dir, exports.settings.input_dir]);
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
      execute_fusion = spawn('fusion', ['--output', exports.settings.output_dir, exports.settings.input_dir]);
      return execute_fusion.stdout.on('data', function(data) {
        return util.log(data);
      });
    }
  };
}).call(this);
