(function() {
  var Compiler, coffee, exec, jasmine, path;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  exec = require('child_process').exec;
  path = require('path');
  coffee = require('coffee-script');
  jasmine = require('jasmine-node');
  Compiler = require('./base').Compiler;
  exports.TestCompiler = (function() {
    __extends(TestCompiler, Compiler);
    function TestCompiler() {
      TestCompiler.__super__.constructor.apply(this, arguments);
    }
    TestCompiler.prototype.filePattern = function() {
      return [/\.coffee$/, /src\/.*\.js$/, new RegExp("" + this.options.templateExtension + "$")];
    };
    TestCompiler.prototype.compile = function(files) {
      var srcdir, testdir;
      srcdir = path.resolve(this.options.brunchPath, 'src');
      testdir = path.resolve(this.options.brunchPath, 'test');
      return exec("coffee -c -o " + testdir + " " + srcdir, __bind(function(error, stdout, stderr) {
        if (error) {
          console.log('Error: TestCompiler could not compile source');
          console.log(stdout.toString().trim());
          return console.log(stderr.toString().trim());
        } else {
          console.log('Running tests in ' + testdir);
          return jasmine.executeSpecsInFolder(testdir, void 0, false, true, /.spec\.(js|coffee)$/i);
        }
      }, this));
    };
    return TestCompiler;
  })();
}).call(this);
