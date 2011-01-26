(function() {
  var fs, path, root, spawn, util, watcher, _;
  root = __dirname + "/../";
  util = require('util');
  fs = require('fs');
  path = require('path');
  watcher = require('watch');
  spawn = require('child_process').spawn;
  _ = require('underscore');
  exports.VERSION = '0.0.8';
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
    main_content = "window." + projectName + " = {}\n" + projectName + ".controllers = {}\n" + projectName + ".models = {}\n" + projectName + ".views = {}\n" + projectName + ".app = {}\n\n# app bootstrapping on document ready\n$(document).ready ->\n  if window.location.hash == ''\n    window.location.hash = 'home'\n  Backbone.history.start()";
    fs.writeFileSync("brunch/src/app/main.coffee", main_content);
    compass_content = "sass_dir = \"../src/stylesheets\"\nhttp_path = \"/static/\"\n\ncss_dir = \"css\"\nimages_dir = \"img\"\njavascripts_dir = \"js\"";
    fs.writeFileSync("brunch/src/config/compass.rb", main_content);
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
    var execute_coffee, execute_compass, execute_fusion;
    console.log('file: ' + file);
    if (file.match(/coffee$/)) {
      execute_coffee = spawn('coffee', ['--lint', '--output', exports.settings.output_dir + 'web', exports.settings.input_dir]);
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
      execute_fusion = spawn('fusion', ['--output', exports.settings.output_dir + 'web/app/templates.js', exports.settings.input_dir + 'templates']);
      execute_fusion.stdout.on('data', function(data) {
        return util.log(data);
      });
    }
    if (file.match(/sass$/)) {
      execute_compass = spawn('compass', ['--config', 'brunch/config/compass.rb', 'src/stylesheets']);
      return execute_compass.stdout.on('data', function(data) {
        return console.log('compiling .sass to .css:\n' + data);
      });
    }
  };
}).call(this);
