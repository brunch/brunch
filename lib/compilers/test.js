(function() {
  var Compiler, exec;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  exec = require('child_process').exec;
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
      return exec('coffee -c -o test src', function(error, stdout, stderr) {
        if (error) {
          console.log('Error: TestCompiler could not compile source');
          console.log(stdout.toString().trim());
          return console.log(stderr.toString().trim());
        } else {
          console.log('Testing...');
          return exec('jasmine-node --coffee test', function(error, stdout, stderr) {
            if (error) {
              return console.log(stdout.toString().trim());
            } else {
              return console.log(stdout.toString().trim());
            }
          });
        }
      });
    };
    return TestCompiler;
  })();
}).call(this);
