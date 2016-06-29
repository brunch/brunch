const path = require('path');
const test = require('ava');
const config = require('../lib/config');

const getFolderName = function(path) {
  return path.match(/([^\/]*)\/*$/)[1];
};

test('loads the config without overriding', async t => {
  const opts = {
    config: path.relative(__dirname, './fixtures/config-with-overrides.js')
  };

  const brunchConfig = await config.loadConfig(false, opts, true);
  brunchConfig.paths.public = getFolderName(brunchConfig.paths.public);
  brunchConfig.paths.watched[0] = getFolderName(brunchConfig.paths.watched[0]);
  brunchConfig.paths.watched[1] = getFolderName(brunchConfig.paths.watched[1]);
  t.is(brunchConfig.paths.public, 'public');
  t.deepEqual(brunchConfig.paths.watched, ['app', 'test']);
});

test('overrides the config using the specified env', async t => {
  const opts = {
    env: 'test',
    config: path.relative(__dirname, './fixtures/config-with-overrides.js')
  };

  const brunchConfig = await config.loadConfig(false, opts, true);
  brunchConfig.paths.watched[0] = getFolderName(brunchConfig.paths.watched[0]);
  brunchConfig.paths.watched[1] = getFolderName(brunchConfig.paths.watched[1]);
  t.is(brunchConfig.paths.public, 'tmp');
  t.deepEqual(brunchConfig.paths.watched, ['app', 'test']);
});
