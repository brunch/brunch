var helpers, rewire;

rewire = require('rewire');

helpers = rewire('../lib/helpers');

describe('helpers', function() {
  describe('replaceConfigSlashes()', function() {
    return it('should replace slashes with backslashes in config', function() {
      var unix, win;
      helpers.__set__('isWindows', true);
      unix = require('./fixtures/unix_config');
      win = require('./fixtures/win_config');
      return expect(helpers.replaceConfigSlashes(unix.config)).to.eql(win.config);
    });
  });
  return describe('applyOverrides()', function() {
    var applyOverrides;
    applyOverrides = helpers.__get__('applyOverrides');
    return it('should resolve plugins.on|off merge', function() {
      var config;
      config = {
        plugins: {
          on: ['a'],
          off: ['b']
        },
        overrides: {
          foo: {
            plugins: {
              on: ['b']
            }
          },
          bar: {
            plugins: {
              off: ['a']
            }
          },
          baz: {
            plugins: {
              on: ['c']
            }
          }
        }
      };
      applyOverrides(config, {
        env: ['foo', 'bar', 'baz']
      });
      return expect(config.plugins).to.eql({
        on: ['c', 'b'],
        off: ['a']
      });
    });
  });
});
