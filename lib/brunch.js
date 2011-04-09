(function() {
  var colors, expressProcess, fileUtil, fs, helpers, package, path, root, spawn, stitch, timeouts;
  root = __dirname + "/../";
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  helpers = require('./helpers');
  fileUtil = require('file');
  colors = require('../vendor/termcolors').colors;
  stitch = require('stitch');
  exports.VERSION = '0.6.2';
  expressProcess = {};
  package = {};
  timeouts = {};
  exports["new"] = function(options, callback) {
    var projectTemplatePath;
    exports.options = options;
    projectTemplatePath = path.join(module.id, "/../../template", exports.options.projectTemplate);
    return path.exists(exports.options.brunchPath, function(exists) {
      if (exists) {
        helpers.log(colors.lred("brunch:   directory already exists - can't create a project in there\n", true));
        process.exit(0);
      }
      fileUtil.mkdirsSync(exports.options.brunchPath, 0755);
      return helpers.recursiveCopy(path.join(projectTemplatePath, 'src/'), path.join(exports.options.brunchPath, 'src'), function() {
        return helpers.recursiveCopy(path.join(projectTemplatePath, 'build/'), exports.options.buildPath, function() {
          if (exports.options.projectTemplate === "express") {
            helpers.recursiveCopy(path.join(projectTemplatePath, 'server/'), path.join(exports.options.brunchPath, 'server'), function() {
              return callback();
            });
          } else {
            callback();
          }
          return helpers.log(colors.lgreen("brunch: created brunch directory layout\n", true));
        });
      });
    });
  };
  exports.watch = function(options) {
    exports.options = options;
    exports.initializePackage(exports.options.brunchPath);
    path.exists(path.join(exports.options.brunchPath, 'server/main.js'), function(exists) {
      if (exists) {
        helpers.log("express:  application started on port " + (colors.blue(exports.options.expressPort, true)) + ": http://0.0.0.0:" + exports.options.expressPort + "\n");
        expressProcess = spawn('node', [path.join(exports.options.brunchPath, 'server/main.js'), exports.options.expressPort, exports.options.brunchPath]);
        return expressProcess.stderr.on('data', function(data) {
          return helpers.log(colors.lred('express err: ' + data));
        });
      }
    });
    return helpers.watchDirectory({
      path: path.join(exports.options.brunchPath, 'src'),
      callOnAdd: true
    }, function(file) {
      return exports.dispatch(file);
    });
  };
  exports.build = function(options) {
    exports.options = options;
    exports.initializePackage(exports.options.brunchPath);
    exports.compilePackage();
    return exports.spawnStylus();
  };
  exports.stop = function() {
    if (expressProcess !== {}) {
      return expressProcess.kill('SIGHUP');
    }
  };
  exports.initializePackage = function(brunchPath) {
    var vendorPath;
    vendorPath = path.join(brunchPath, 'src/vendor');
    package = stitch.createPackage({
      dependencies: [path.join(vendorPath, 'ConsoleDummy.js'), path.join(vendorPath, 'jquery-1.5.2.js'), path.join(vendorPath, 'underscore-1.1.5.js'), path.join(vendorPath, 'backbone-0.3.3.js')],
      paths: [path.join(brunchPath, 'src/app/')]
    });
    return package;
  };
  exports.dispatch = function(file, options) {
    var queueCoffee, templateExtensionRegex;
    queueCoffee = function(func) {
      clearTimeout(timeouts.coffee);
      return timeouts.coffee = setTimeout(func, 100);
    };
    if (file.match(/\.coffee$/)) {
      queueCoffee(function() {
        return exports.compilePackage();
      });
    }
    templateExtensionRegex = new RegExp("" + exports.options.templateExtension + "$");
    if (file.match(templateExtensionRegex)) {
      exports.compilePackage();
    }
    if (file.match(/src\/.*\.js$/)) {
      exports.compilePackage();
    }
    if (file.match(/\.styl$/)) {
      return exports.spawnStylus();
    }
  };
  exports.compilePackage = function() {
    return package.compile(function(err, source) {
      if (err) {
        console.log(colors.lred(err, true));
      }
      return fs.writeFile(path.join(exports.options.buildPath, 'web/js/app.js'), source, function(err) {
        if (err) {
          console.log(colors.lred(err, true));
        }
        return helpers.log("stitch:   " + (colors.green('compiled', true)) + " application\n");
      });
    });
  };
  exports.spawnStylus = function() {
    var executeStylus;
    path.join(exports.options.brunchPath, 'src');
    executeStylus = spawn('stylus', ['--compress', '--out', path.join(exports.options.buildPath, 'web/css'), path.join(exports.options.brunchPath, 'src/app/styles/main.styl')]);
    executeStylus.stdout.on('data', function(data) {
      return helpers.log('stylus: ' + data);
    });
    return executeStylus.stderr.on('data', function(data) {
      return helpers.log(colors.lred('stylus err: ' + data));
    });
  };
}).call(this);
