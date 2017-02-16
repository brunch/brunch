'use strict';
const path = require('path');
const test = require('ava');
const loadConfig = require('../lib/utils/config');

const getFolderName = path => {
  return /([^/]*)\/*$/.exec(path)[1];
};

process.chdir(path.join(__dirname, 'fixtures'));

test('loads the config without overriding', function* (t) {
  const opts = {
    paths: {
      config: 'config-with-overrides.js',
    },
  };

  const brunchConfig = yield loadConfig([], opts);
  const watched = brunchConfig.paths.watched.map(getFolderName);

  t.is(getFolderName(brunchConfig.paths.public), 'public');
  t.deepEqual(watched, ['app', 'test']);
});

test('overrides the config using the specified env', function* (t) {
  const opts = {
    paths: {
      config: 'config-with-overrides.js',
    },
  };

  const brunchConfig = yield loadConfig(['test'], opts);
  const watched = brunchConfig.paths.watched.map(getFolderName);

  t.is(brunchConfig.paths.public, 'tmp');
  t.deepEqual(watched, ['app', 'test']);
});

test('removes trailing slash from paths', function* (t) {
  const opts = {
    paths: {
      config: 'config-with-trailing-slashes.js',
    },
  };

  const brunchConfig = yield loadConfig([], opts);

  t.deepEqual(brunchConfig.paths.watched, ['app/assets']);
  t.is(brunchConfig.paths.public, 'app/builds');
});
