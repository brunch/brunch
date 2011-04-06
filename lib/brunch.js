(function() {
  var colors, fs, glob, helpers, package, path, root, spawn, stitch, timeouts, vendorPath;
  root = __dirname + "/../";
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  glob = require('glob');
  helpers = require('./helpers');
  colors = require('../vendor/termcolors').colors;
  stitch = require('stitch');
  exports.VERSION = '0.6.2';
  vendorPath = 'brunch/src/vendor/';
  package = stitch.createPackage({
    dependencies: ["" + vendorPath + "ConsoleDummy.js", "" + vendorPath + "jquery-1.5.2.js", "" + vendorPath + "underscore-1.1.5.js", "" + vendorPath + "backbone-0.3.3.js"],
    paths: ['brunch/src/app/']
  });
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
      path: 'brunch/src',
      callOnAdd: true
    }, function(file) {
      return exports.dispatch(file);
    });
  };
  exports.build = function(options) {
    exports.options = options;
    exports.compilePackage();
    return exports.spawnStylus();
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
      return fs.writeFile('brunch/build/web/js/app.js', source, function(err) {
        if (err) {
          throw err;
        }
        return helpers.log('stitch:   \033[90mcompiled\033[0m application\n');
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
      return helpers.log('stylus err: ' + data);
    });
  };
}).call(this);
