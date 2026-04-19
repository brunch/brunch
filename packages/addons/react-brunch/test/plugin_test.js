describe('Plugin', function() {
  var plugin, plugin2;

  beforeEach(function() {
    plugin = new Plugin({});
  });

  it('should be an object', function() {
    expect(plugin).to.be.ok;
  });

  it('should has #compile method', function() {
    expect(plugin.compile).to.be.an.instanceof(Function);
  });

  it('should compile and produce valid result', function(done) {
    var content = 'var a = 6;';
    var expected = 'var a = 6;';

    plugin.compile({data: content, path: 'file.jsx'}, function(error, result) {
      var data = (result || {}).data;
      expect(error).not.to.be.ok;
      expect(data).to.equal(expected);
      done();
    });
  });

  it('should compile and produce valid result from JSX content', function(done) {
    var content = 'var div = <div></div>;';
    var expected = 'var div = React.createElement(\"div\", null);';

    plugin.compile({data: content, path: 'file.jsx'}, function(error, result) {
      var data = (result || {}).data;
      expect(error).not.to.be.ok;
      expect(data).to.equal(expected);
      done();
    });
  });

  it('should compile and produce valid result from JSX content with harmony additions (deprecated way)', function(done) {
    var content = 'var div = <div></div>; var x= (y) => x * y';
    var expected = 'var div = React.createElement(\"div\", null); var x= function(y)  {return x * y;}';

    plugin2= new Plugin({
      plugins: {
        react: {
          harmony: true
        }
      }
    });

    plugin2.compile({data: content, path: 'file.jsx'}, function(error, result) {
      var data = result.data;
      expect(error).not.to.be.ok;
      expect(data).to.equal(expected);
      done();
    });
  });

  it('should compile and produce valid result from JSX content with harmony additions', function(done) {
    var content = 'var div = <div></div>; var x= (y) => x * y';
    var expected = 'var div = React.createElement(\"div\", null); var x= function(y)  {return x * y;}';

    plugin2= new Plugin({
      plugins: {
        react: {
          transformOptions: {
            harmony: true
          }
        }
      }
    });

    plugin2.compile({data: content, path: 'file.jsx'}, function(error, result) {
      var data = result.data;
      expect(error).not.to.be.ok;
      expect(data).to.equal(expected);
      done();
    });
  });

  it('should compile and produce valid result from JSX content with babel additions', function(done) {
    var content = 'var div = <div></div>; var x= (y) => x * y';
    var expected = "\"use strict\";\n\nvar div = React.createElement(\"div\", null);var x = (function (_x) {\n  function x(_x2) {\n    return _x.apply(this, arguments);\n  }\n\n  x.toString = function () {\n    return x.toString();\n  };\n\n  return x;\n})(function (y) {\n  return x * y;\n});";

    plugin2= new Plugin({
      plugins: {
        react: {
          babel: true
        }
      }
    });

    plugin2.compile({data: content, path: 'file.jsx'}, function(error, result) {
      var data = result.data;
      expect(error).not.to.be.ok;
      expect(data).to.equal(expected);
      done();
    });
  });

});
