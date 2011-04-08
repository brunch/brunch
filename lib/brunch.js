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
      helpers.copy(path.join(projectTemplatePath, 'src/'), path.join(exports.options.brunchPath, 'src'));
      helpers.copy(path.join(projectTemplatePath, 'build/'), path.join(exports.options.brunchPath, 'build'));
      helpers.copy(path.join(projectTemplatePath, 'config/'), path.join(exports.options.brunchPath, 'config'));
      if (exports.options.projectTemplate === "express") {
        helpers.copy(path.join(projectTemplatePath, 'server/'), path.join(exports.options.brunchPath, 'server'));
      }
      helpers.log(colors.lgreen("brunch: created brunch directory layout\n", true));
      return callback();
    });
  };
  exports.watch = function(options) {
    exports.options = options;
    exports.initializePackage(exports.options.brunchPath);
    path.exists('brunch/server/main.js', function(exists) {
      if (exists) {
        helpers.log("express:  application started on port " + (colors.blue(exports.options.expressPort, true)) + ": http://0.0.0.0:" + exports.options.expressPort + "\n");
        expressProcess = spawn('node', ['brunch/server/main.js', exports.options.expressPort]);
        return expressProcess.stderr.on('data', function(data) {
          return helpers.log(colors.lred('express err: ' + data));
        });
      }
    });
    return helpers.watchDirectory({
      path: 'brunch/src',
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
      paths: ['brunch/src/app/']
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
    if (file.match(/brunch\/src\/.*\.js$/)) {
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
      return fs.writeFile('brunch/build/web/js/app.js', source, function(err) {
        if (err) {
          console.log(colors.lred(err, true));
        }
        return helpers.log("stitch:   " + (colors.green('compiled', true)) + " application\n");
      });
    });
  };
  exports.spawnStylus = function() {
    var executeStylus;
    executeStylus = spawn('stylus', ['--compress', '--out', 'brunch/build/web/css', 'brunch/src/app/styles/main.styl']);
    executeStylus.stdout.on('data', function(data) {
      return helpers.log('stylus: ' + data);
    });
    return executeStylus.stderr.on('data', function(data) {
      return helpers.log(colors.lred('stylus err: ' + data));
    });
  };
}).call(this);
