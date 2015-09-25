var generate;

generate = require('../lib/fs_utils/generate');

describe('generate', function() {
  return describe('sortByConfig()', function() {
    it('should files by config.before', function() {
      var config, files;
      files = ['backbone.js', 'jquery.js', 'underscore.js'];
      config = {
        before: ['jquery.js', 'underscore.js', 'backbone.js']
      };
      return expect(generate.sortByConfig(files, config)).to.eql(config.before);
    });
    it('should files by config.after', function() {
      var config, files;
      files = ['helper-1.js', 'backbone.js', 'helper-2.js'];
      config = {
        after: ['helper-1.js', 'helper-2.js']
      };
      return expect(generate.sortByConfig(files, config)).to.eql(['backbone.js', 'helper-1.js', 'helper-2.js']);
    });
    it('should files by config.vendor', function() {
      var config, files;
      files = ['vendor/backbone.js', 'jquery.js', 'meh/underscore.js'];
      config = {
        vendorConvention: function(path) {
          return /^(meh|vendor)/.test(path);
        }
      };
      return expect(generate.sortByConfig(files, config)).to.eql(['meh/underscore.js', 'vendor/backbone.js', 'jquery.js']);
    });
    it('should files alphabetically', function() {
      var config, files;
      files = ['z', 'e', 'a', 'd', 'c', 's', 'z'];
      config = {};
      return expect(generate.sortByConfig(files, config)).to.eql(['a', 'c', 'd', 'e', 's', 'z', 'z']);
    });
    return it('should sort files by config correctly', function() {
      var config, files;
      files = ['a', 'b', 'c', 'vendor/5', 'vendor/4', 'd', 'vendor/1', 'vendor/3', 'vendor/6', 'e', 'vendor/2'];
      config = {
        before: ['vendor/1', 'vendor/2', 'vendor/3', 'vendor/4', 'vendor/5'],
        after: ['b'],
        vendorConvention: function(path) {
          return /vendor\//.test(path);
        }
      };
      return expect(generate.sortByConfig(files, config)).to.eql(['vendor/1', 'vendor/2', 'vendor/3', 'vendor/4', 'vendor/5', 'vendor/6', 'a', 'c', 'd', 'e', 'b']);
    });
  });
});
