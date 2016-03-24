const test = require('ava');
const rewire = require('rewire');
const application = rewire('../lib/config');

test('applyOverrides / should resolve plugins.on|off merge', t => {
  // describe('replaceConfigSlashes()', function() {
  //   return it('should replace slashes with backslashes in config', function() {
  //     application.__set__('isWindows', true);
  //     const unix = require('./fixtures/unix_config');
  //     const win = require('./fixtures/win_config');
  //     return expect(application.replaceConfigSlashes(unix.config)).to.eql(win.config);
  //   });
  // });
  const applyOverrides = application.__get__('applyOverrides');
  const config = {
    server: {},
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
    },
    files: {},
    paths: {}
  };
  applyOverrides(config, {
    env: ['foo', 'bar', 'baz']
  });
  t.same(config.plugins, {
    on: ['c', 'b'],
    off: ['a']
  });
});
