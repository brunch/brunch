var expect = require('chai').expect;
var Plugin = require('./');

describe('Plugin', function() {
  var plugin;

  beforeEach(function() {
    plugin = new Plugin({});
  });

  it('is an object', function() {
    expect(plugin).to.be.ok;
  });

  it('has #compile method', function() {
    expect(plugin.compile).to.be.an.instanceof(Function);
  });

  it('compiles and produces valid result', function(done) {
    var content = 'a = 1';
    var expected = 'var a;\na = 1;';

    plugin.compile({data: content, path: 'file.ls'}).then(data => {
      expect(data).to.be.equal(expected);
      done();
    }, error => expect(error).not.to.be.ok);
  });

  it('compiles and produces valid resault and sourcemap', function(done) {
    plugin = new Plugin({sourceMaps: true});

    var content = 'a = 1';
    var expected = 'var a;\na = 1;\n';

    plugin.compile({data: content, path: 'file.ls'}).then(data => {
      expect(data).to.be.an('object');
      expect(data.data).to.be.a('string');
      expect(data.data).to.equal(expected);
      expect(data.map).to.be.a('string');
      done();
    }, error => expect(error).not.to.be.ok);
  });

  it('accepts explicit bare option', function(done) {
    plugin = new Plugin({plugins:{livescript:{bare: false}}});

    var content = 'a = 1';
    var expected = '(function(){\n  var a;\n  a = 1;\n}).call(this);\n';

    plugin.compile({data: content, path: 'file.ls'}).then(data => {
      expect(data).to.equal(expected);
      done();
    }, error => expect(error).not.to.be.ok);
  });

  it('accepts explicit const option', function(done) {
    plugin = new Plugin({plugins:{livescript:{const: true}}});

    var content = 'a = 1\na = 2';
    var expected = 'SyntaxError: redeclaration of constant "a"';

    plugin.compile({data: content, path: 'file.ls'}).then(null, error => {
      expect(error).to.be.ok;
      expect(error).to.include(expected);
      done();
    });
  });
});
