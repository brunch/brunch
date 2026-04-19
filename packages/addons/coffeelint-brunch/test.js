const expect = require('chai').expect;
const Plugin = require('.');

describe('Plugin', function() {
  var plugin;

  beforeEach(function() {
    plugin = new Plugin({
      plugins: {
        coffeelint: {
          options: {no_trailing_semicolons: { level: "ignore"} }
        }
      }
    });
  });

  it('should be an object', function() {
    expect(plugin).to.be.ok;
  });

  it('should has #lint method', function() {
    expect(plugin.lint).to.be.an.instanceof(Function);
  });

  it('should lint correctly', function(done) {
    var content = 'a = 228\nb = () ->\n  console.log a'

    plugin.lint(content, 'file.coffee').then(() => done(), error => expect(error).not.to.be.ok);
  });

  it('should give correct errors', function(done) {
    var content = 'b = () ->\n\t\t   a=10'

    plugin.lint(content, 'file.coffee').then(null, error => {
      expect(error).to.contain('error: indentation at line 2. Expected 2 got 5\nerror: no_tabs at line 2.');
      done();
    });
  });

  it('should read configs global options list', function(done) {
    var content = 'alert("end of line");'

    plugin.lint(content, 'file.coffee').then(() => done(), error => expect(error).not.to.be.ok);
  });

  it('should read coffeelint.json', function(done) {
    var content = 'a++'

    plugin = new Plugin({
      plugins: {
        coffeelint: {
          useCoffeelintJson: true
        }
      }
    });

    plugin.lint(content, 'file.coffee').then(null, error => {
      expect(error).to.contain('error: no_plusplus at line 1. found \'++\'');
      done();
    });
  });
});
