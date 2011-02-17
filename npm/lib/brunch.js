(function() {
  var brunch, fs, glob, helpers, path, root, spawn, util;
  root = __dirname + "/../";
  util = require('util');
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  glob = require('glob');
  brunch = require('brunch');
  helpers = require('./helpers');
  exports.VERSION = '0.3.2';
  exports["new"] = function(projectName, options, callback) {
    var projectTemplatePath;
    exports.options = options;
    projectTemplatePath = path.join(module.id, "/../../template", exports.options.projectTemplate);
    return path.exists('brunch', function(exists) {
      if (exists) {
        util.log("Brunch: brunch directory already exists - can't create another project");
        process.exit(0);
      }
      fs.mkdirSync('brunch', 0755);
      helpers.copy(path.join(projectTemplatePath, 'src/'), 'brunch/src');
      helpers.copy(path.join(projectTemplatePath, 'build/'), 'brunch/build');
      helpers.copy(path.join(projectTemplatePath, 'config/'), 'brunch/config');
      if (exports.options.projectTemplate === "express") {
        helpers.copy(path.join(projectTemplatePath, 'server/'), 'brunch/server');
      }
      util.log("Brunch: created brunch directory layout\n");
      return callback();
    });
  };
  exports.watch = function(options) {
    var executeServer;
    exports.options = options;
    if (exports.options.projectTemplate === "express") {
      executeServer = spawn('node', ['brunch/server/main.js']);
    }
    return helpers.watchDirectory({
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
    executeCoffee.stdout.on('data', function(data) {
      return util.log('Coffee:  ' + data);
    });
    executeCoffee.stderr.on('data', function(data) {
      return util.log('Coffee err: ' + data);
    });
    return executeCoffee.on('exit', function(code) {
      if (code === 0) {
        return util.log('Coffee: compiled .coffee to .js\n');
      } else {
        return util.log('Coffee err: There was a problem during .coffee to .js compilation. see above');
      }
    });
  };
  exports.spawnDocco = function(sourcePaths) {
    var executeDocco;
    executeDocco = spawn('docco', sourcePaths);
    executeDocco.stdout.on('data', function(data) {
      return util.log('Docco:  ' + data);
    });
    return executeDocco.stderr.on('data', function(data) {
      return util.log('Docco err:  ' + data);
    });
  };
  exports.spawnFusion = function() {
    var executeFusion;
    executeFusion = spawn('fusion', ['--config', 'brunch/config/fusion/options.yaml', 'brunch/src/app/templates']);
    executeFusion.stdout.on('data', function(data) {
      return util.log('Fusion: ' + data);
    });
    return executeFusion.stderr.on('data', function(data) {
      return util.log('Fusion err: ' + data);
    });
  };
  exports.spawnStylus = function() {
    var executeStylus;
    executeStylus = spawn('stylus', ['--compress', '--out', 'brunch/build/web/css', 'brunch/src/app/styles/main.styl']);
    executeStylus.stdout.on('data', function(data) {
      return util.log('Stylus: ' + data);
    });
    return executeStylus.stderr.on('data', function(data) {
      return util.log('Stylus err: ' + data);
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
        util.log(err);
      }
      for (_i = 0, _len = files.length; _i < _len; _i++) {
        file = files[_i];
        exports.copyJsFile(file);
      }
      return util.log('Brunch: copied .js files to build folder\n');
    });
  };
}).call(this);
