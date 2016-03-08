const rewire = require('rewire');
const application = rewire('../lib/config');

describe('helpers', function() {
  // describe('replaceConfigSlashes()', function() {
  //   return it('should replace slashes with backslashes in config', function() {
  //     application.__set__('isWindows', true);
  //     const unix = require('./fixtures/unix_config');
  //     const win = require('./fixtures/win_config');
  //     return expect(application.replaceConfigSlashes(unix.config)).to.eql(win.config);
  //   });
  // });
  return describe('applyOverrides()', function() {
    const applyOverrides = application.__get__('applyOverrides');
    it('should resolve plugins.on|off merge', function() {
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
