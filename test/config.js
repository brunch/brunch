const path = require('path');
const test = require('ava');
const config = require('../lib/config');

test('loads the config without overriding', t => {
  const opts = {
    config: path.relative(__dirname, './fixtures/config-with-overrides.js')
  };

  return config.loadConfig(false, opts, true).then((config) => {
    const publicPath = config.paths.public.match(/([^\/]*)\/*$/)[1];
    const appPath = config.paths.watched[0].match(/([^\/]*)\/*$/)[1];
    const testPath = config.paths.watched[1].match(/([^\/]*)\/*$/)[1];
    t.is(publicPath, 'public');
    t.deepEqual([appPath, testPath], ['app', 'test']);
  });
});

test('overrides the config using the specified env', t => {
  const opts = {
    env: 'test',
    config: path.relative(__dirname, './fixtures/config-with-overrides.js')
  };

  return config.loadConfig(false, opts, true).then((config) => {
    const appPath = config.paths.watched[0].match(/([^\/]*)\/*$/)[1];
    const testPath = config.paths.watched[1].match(/([^\/]*)\/*$/)[1];
    t.is(config.paths.public, 'tmp');
    t.deepEqual([appPath, testPath], ['app', 'test']);
  });
});
