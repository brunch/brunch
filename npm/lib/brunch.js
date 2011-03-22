(function() {
  var colors, fs, glob, helpers, path, root, spawn, sys, timeouts, util;
  root = __dirname + "/../";
  util = require('util');
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  glob = require('glob');
  helpers = require('./helpers');
  colors = require('../vendor/termcolors').colors;
  sys = require('sys');
  exports.VERSION = '0.5.8';
  exports["new"] = function(projectName, options, callback) {
    var projectTemplatePath;
    exports.options = options;
    projectTemplatePath = path.join(module.id, "/../../template", exports.options.projectTemplate);
    return path.exists('brunch', function(exists) {
      if (exists) {
        helpers.log("brunch:   brunch directory already exists - can't create another project\n");
        process.exit(0);
      }
      fs.mkdirSync('brunch', 0755);
      helpers.copy(path.join(projectTemplatePath, 'src/'), 'brunch/src');
      helpers.copy(path.join(projectTemplatePath, 'build/'), 'brunch/build');
      helpers.copy(path.join(projectTemplatePath, 'config/'), 'brunch/config');
      if (exports.options.projectTemplate === "express") {
        helpers.copy(path.join(projectTemplatePath, 'server/'), 'brunch/server');
      }
      helpers.log("brunch:   \033[90mcreated\033[0m brunch directory layout\n");
      return callback();
    });
  };
  exports.watch = function(options) {
    exports.options = options;
    path.exists('brunch/server/main.js', function(exists) {
      var executeServer;
      if (exists) {
        helpers.log("" + exports.options.expressPort + "\n");
        executeServer = spawn('node', ['brunch/server/main.js', exports.options.expressPort]);
        return executeServer.stderr.on('data', function(data) {
          return helpers.log('Express err: ' + data);
        });
      }
    });
    return helpers.watchDirectory({
      path: 'brunch',
      callOnAdd: true
    }, function(file) {
      return exports.dispatch(file);
    });
  };
  exports.build = function(options) {
    var sourcePaths;
    exports.options = options;
    sourcePaths = exports.generateSourcePaths();
    exports.spawnCoffee(sourcePaths);
    if (!exports.options.noDocco) {
      exports.spawnDocco(sourcePaths);
    }
    exports.spawnFusion();
    exports.spawnStylus();
    return exports.copyJsFiles();
  };
  timeouts = {};
  exports.dispatch = function(file, options) {
    var queueCoffee, templateExtensionRegex;
    queueCoffee = function(func) {
      clearTimeout(timeouts.coffee);
      return timeouts.coffee = setTimeout(func, 100);
    };
    if (file.match(/\.coffee$/)) {
      queueCoffee(function() {
        var sourcePaths;
        sourcePaths = exports.generateSourcePaths();
        exports.spawnCoffee(sourcePaths);
        if (!exports.options.noDocco) {
          return exports.spawnDocco(sourcePaths);
        }
      });
    }
    templateExtensionRegex = new RegExp("" + exports.options.templateExtension + "$");
    if (file.match(templateExtensionRegex)) {
      exports.spawnFusion();
    }
    if (file.match(/\.styl$/)) {
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
    var coffeeParams, executeCoffee, output;
    coffeeParams = ['--output', 'brunch/build/web/js', '--join', '--lint', '--compile'];
    coffeeParams = coffeeParams.concat(sourcePaths);
    executeCoffee = spawn('coffee', coffeeParams);
    output = {
      stdout: '',
      stderr: ''
    };
    executeCoffee.stdout.on('data', function(data) {
      return output.stdout += data;
    });
    executeCoffee.stderr.on('data', function(data) {
      return output.stderr += data;
    });
    return executeCoffee.on('exit', function(code) {
      if (code === 0) {
        return helpers.log('coffee:   \033[90mcompiled\033[0m .coffee to .js\n');
      } else {
        helpers.log(colors.lred('coffee err: There was a problem during .coffee to .js compilation.\n\n', true));
        return helpers.log(colors.lgray(output.stderr + '\n\n'));
      }
    });
  };
  exports.spawnDocco = function(sourcePaths) {
    var executeDocco;
    executeDocco = spawn('docco', sourcePaths);
    executeDocco.stdout.on('data', function(data) {
      return helpers.log(data);
    });
    return executeDocco.stderr.on('data', function(data) {
      return helpers.log('err:  ' + data);
    });
  };
  exports.spawnFusion = function() {
    var executeFusion;
    executeFusion = spawn('fusion', ['--config', 'brunch/config/fusion/options.yaml', 'brunch/src/app/templates']);
    executeFusion.stdout.on('data', function(data) {
      return helpers.log('fusion: ' + data);
    });
    return executeFusion.stderr.on('data', function(data) {
      return helpers.log('fusion err: ' + data);
    });
  };
  exports.spawnStylus = function() {
    var executeStylus;
    executeStylus = spawn('stylus', ['--compress', '--out', 'brunch/build/web/css', 'brunch/src/app/styles/main.styl']);
    executeStylus.stdout.on('data', function(data) {
      return helpers.log('stylus: ' + data);
    });
    return executeStylus.stderr.on('data', function(data) {
      return helpers.log('stylus err: ' + data);
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
        helpers.log(err);
      }
      for (_i = 0, _len = files.length; _i < _len; _i++) {
        file = files[_i];
        exports.copyJsFile(file);
      }
      return helpers.log('brunch:   \033[90mcopied\033[0m .js files to build folder\n');
    });
  };
}).call(this);
