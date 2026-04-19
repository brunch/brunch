var expect = require('chai').expect;
var parse = require('color-parser');
var Plugin = require('./');

describe('Plugin', function() {
  var plugin;
  var config = {
    plugins: {
      styl: {
        functions: {
          rgba: function(color, alpha){
            var args;
            if (2 == arguments.length) {
              var c = parse(color.trim());
              args = [c.r, c.g, c.b, alpha];
            } else {
              args = [].slice.call(arguments);
            }

            return 'rgba(' + args.join(', ') + ')';
          },
        }
      }
    }
  }

  beforeEach(function() {
    plugin = new Plugin(config);
  });

  it('should be an object', function() {
    expect(plugin).to.be.ok;
  });


  describe('#compile', function() {
    it('should has #compile method', function() {
      expect(plugin.compile).to.be.an.instanceof(Function);
    });

    it('should compile and produce valid result', function(done) {
      var content = 'body\n  transition: height';
      var expected = 'body {\n  transition: height;\n}';

      plugin.compile({data: content, path: 'a.styl'}).then(data => {
        expect(data.data).to.equal(expected);
        done();
      }, error => expect(error).to.equal());
    });

    it('should support extensions', function(done) {
      var content = 'body\n  color: rgba(#ccc, .5)';
      var expected = 'body {\n  color: rgba(204, 204, 204, .5);\n}';

      plugin.compile({data: content, path: 'a.styl'}).then(data => {
        expect(data.data).to.equal(expected);
        done();
      }, error => expect(error).to.equal());
    });
  });
});
