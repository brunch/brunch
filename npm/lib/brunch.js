(function() {
  var brunch, fs, glob, path, root, spawn, util, _;
  root = __dirname + "/../";
  util = require('util');
  fs = require('fs');
  path = require('path');
  spawn = require('child_process').spawn;
  _ = require('underscore');
  glob = require('glob');
  brunch = require('brunch');
  exports.VERSION = '0.2.3';
  exports.run = function(options) {
    exports.options = options;
    if (exports.options.watch) {
      return exports.watch();
    }
  };
  exports.newProject = function(projectName, options) {
    var directory, directoryLayout, fusionConfig, fusionHook, homeTemplate, homeView, indexHtml, mainContent, mainController, mainStyle, projectTemplatePath, _i, _len;
    exports.options = options;
    projectTemplatePath = path.join(module.id + "/../../template");
    directoryLayout = ["", "config", "config/fusion", "build", "build/web", "build/web/css", "src", "src/app", "src/app/controllers", "src/app/helpers", "src/app/models", "src/app/styles", "src/app/templates", "src/app/views", "src/lib", "src/vendor"];
    for (_i = 0, _len = directoryLayout.length; _i < _len; _i++) {
      directory = directoryLayout[_i];
      fs.mkdirSync("brunch/" + directory, 0755);
    }
    mainController = "class MainController extends Backbone.Controller\n  routes :\n    \"!/home\": \"home\"\n\n  constructor: ->\n    super\n\n  home: ->\n    " + projectName + ".views.home.render()\n\n# init controller\n" + projectName + ".controllers.main = new MainController()";
    fs.writeFileSync("brunch/src/app/controllers/main_controller.coffee", mainController);
    homeView = "class HomeView extends Backbone.View\n  id: 'home-view'\n\n  render: ->\n    $(@.el).html(" + projectName + ".templates.home())\n    $('body').html(@.el)\n\n" + projectName + ".views.home = new HomeView()";
    fs.writeFileSync("brunch/src/app/views/home_view.coffee", homeView);
    homeTemplate = "<h1>Hello World! Welcome to brunch</h1>";
    fs.writeFileSync("brunch/src/app/templates/home.eco", homeTemplate);
    mainStyle = "h1\n  color #999";
    fs.writeFileSync("brunch/src/app/styles/main.styl", mainStyle);
    mainContent = "window." + projectName + " = {}\n" + projectName + ".controllers = {}\n" + projectName + ".models = {}\n" + projectName + ".views = {}\nwindow.module = {} # dirty workaround until eco's namespace is fixed\n\n# app bootstrapping on document ready\n$(document).ready ->\n  Backbone.history.saveLocation(\"!/home\") if '' == Backbone.history.getFragment()\n  Backbone.history.start()";
    fs.writeFileSync("brunch/src/app/main.coffee", mainContent);
    fusionConfig = "hook: \"brunch/config/fusion/hook.js\"\noutput: \"brunch/build/web/js/templates.js\"\ntemplateExtension: \"" + exports.options.templateExtension + "\"\nnamespace: \"window." + projectName + "\"";
    fs.writeFileSync("brunch/config/fusion/options.yaml", fusionConfig);
    fusionHook = "var eco = require('eco');\nexports.compileTemplate = function(content) {\n  return eco.compile(content);\n};";
    fs.writeFileSync("brunch/config/fusion/hook.js", fusionHook);
    indexHtml = "<!doctype html>\n<html lang=\"en\">\n<head>\n  <script src=\"http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.5.min.js\"></script>\n  <script src=\"http://cdn.brunchwithcoffee.com/js/underscore/1.1.3/underscore-min.js\"></script>\n  <script src=\"http://cdn.brunchwithcoffee.com/js/backbone/0.3.3/backbone-min.js\"></script>\n  <script src=\"web/js/concatenation.js\"></script>\n  <script src=\"web/js/templates.js\"></script>\n</head>\n<body>\n</body>";
    fs.writeFileSync("brunch/build/index.html", indexHtml);
    fs.linkSync(path.join(projectTemplatePath, "app", "styles", "reset.styl"), "brunch/src/app/styles/reset.styl");
    return console.log("created brunch directory layout");
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
    var appSource, appSources, coffeeParams, executeCoffee, executeDocco, executeFusion, executeStylus, globbedPaths, sourcePaths, templateExtensionRegex, _i, _len;
    console.log('file: ' + file);
    if (file.match(/coffee$/)) {
      appSources = ['brunch/src/app/helpers/*.coffee', 'brunch/src/app/models/*.coffee', 'brunch/src/app/collections/*.coffee', 'brunch/src/app/controllers/*.coffee', 'brunch/src/app/views/*.coffee'];
      sourcePaths = [];
      for (_i = 0, _len = appSources.length; _i < _len; _i++) {
        appSource = appSources[_i];
        globbedPaths = glob.globSync(appSource, 0);
        sourcePaths = sourcePaths.concat(globbedPaths);
      }
      sourcePaths.unshift('brunch/src/app/main.coffee');
      coffeeParams = ['--output', 'brunch/build/web/js', '--join', '--lint', '--compile'];
      coffeeParams = coffeeParams.concat(sourcePaths);
      executeCoffee = spawn('coffee', coffeeParams);
      executeCoffee.stderr.on('data', function(data) {
        return util.log(data);
      });
      executeCoffee.on('exit', function(code) {
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
    templateExtensionRegex = new RegExp("" + exports.options.templateExtension + "$");
    if (file.match(templateExtensionRegex)) {
      console.log('fusion');
      executeFusion = spawn('fusion', ['--config', 'brunch/config/fusion/options.yaml', 'brunch/src/app/templates']);
      executeFusion.stdout.on('data', function(data) {
        return util.log(data);
      });
    }
    if (file.match(/styl$/)) {
      console.log('stylesheets');
      executeStylus = spawn('stylus', ['--compress', '--out', 'brunch/build/web/css', 'brunch/src/app/styles/main.styl']);
      return executeStylus.stdout.on('data', function(data) {
        return util.log('compiling .style to .css:\n' + data);
      });
    }
  };
}).call(this);
