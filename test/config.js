'use strict';
const path = require('path');
const test = require('ava-no-babel');
const config = require('../lib/config');

const getFolderName = path => {
  return /([^\/]*)\/*$/.exec(path)[1];
};

test('loads the config without overriding', function* (t) {
  const opts = {
    config: path.relative(__dirname, './fixtures/config-with-overrides.js'),
  };

  const brunchConfig = yield config.loadConfig(false, opts, true);
  const watched = brunchConfig.paths.watched.map(getFolderName);

  t.is(getFolderName(brunchConfig.paths.public), 'public');
  t.deepEqual(watched, ['app', 'test']);
});

test('overrides the config using the specified env', function* (t) {
  const opts = {
    env: 'test',
    config: path.relative(__dirname, './fixtures/config-with-overrides.js'),
  };

  const brunchConfig = yield config.loadConfig(false, opts, true);
  const watched = brunchConfig.paths.watched.map(getFolderName);

  t.is(brunchConfig.paths.public, 'tmp');
  t.deepEqual(watched, ['app', 'test']);
});

test('removes trailing slash from paths', function* (t) {
  const opts = {
    config: path.relative(__dirname, './fixtures/config-with-trailing-slashes.js'),
  };

  const brunchConfig = yield config.loadConfig(false, opts, true);

  t.deepEqual(brunchConfig.paths.watched, [
    'app/assets',
  ]);
  t.is(brunchConfig.paths.public, 'app/builds');
});
