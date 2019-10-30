'use strict';
const path = require('path');
const test = require('ava');
const config = require('../lib/utils/config');

const getFolderName = path => {
  return /([^/]*)\/*$/.exec(path)[1];
};

test('loads the config without overriding', async function (t) {
  const opts = {
    config: path.join(__dirname, './fixtures/config-with-overrides.js'),
  };

  const brunchConfig = await config.loadConfig(false, opts, true);
  const watched = brunchConfig.paths.watched.map(getFolderName);

  t.is(getFolderName(brunchConfig.paths.public), 'public');
  t.deepEqual(watched, ['app', 'test']);
});

test('overrides the config using the specified env', async (t) => {
  const opts = {
    env: 'test',
    config: path.join(__dirname, './fixtures/config-with-overrides.js'),
  };

  const brunchConfig = await config.loadConfig(false, opts, true);
  const watched = brunchConfig.paths.watched.map(getFolderName);

  t.is(brunchConfig.paths.public, 'tmp');
  t.deepEqual(watched, ['app', 'test']);
});

test('removes trailing slash from paths', async (t) => {
  const opts = {
    config: path.join(__dirname, './fixtures/config-with-trailing-slashes.js'),
  };

  const brunchConfig = await config.loadConfig(false, opts, true);

  t.deepEqual(brunchConfig.paths.watched, [
    'app/assets',
  ]);
  t.is(brunchConfig.paths.public, 'app/builds');
});
