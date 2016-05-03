const path = require('path');
const test = require('ava');
const config = require('../lib/config');

test('loads the config without overriding', t => {
  const opts = {
    config: path.relative(__dirname, './fixtures/config-with-overrides.js')
  };

  return config.loadConfig(false, opts, true).then((config) => {
    t.is(config.paths.public, 'public');
    t.deepEqual(config.paths.watched, ['app', 'test']);
  });
});

test('overrides the config using the specified env', t => {
  const opts = {
    env: 'test',
    config: path.relative(__dirname, './fixtures/config-with-overrides.js')
  };

  return config.loadConfig(false, opts, true).then((config) => {
    t.is(config.paths.public, 'tmp');
    t.deepEqual(config.paths.watched, ['app', 'test']);
  });
});
