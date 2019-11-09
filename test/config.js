'use strict';
const path = require('path');
const test = require('ava');
const config = require('../lib/utils/config');

const getFolderName = path => {
  return /([^/]*)\/*$/.exec(path)[1];
};

test('config: loads the config without overriding', async t => {
  const opts = {
    config: path.join(__dirname, './fixtures/config-with-overrides.js'),
    persistent: false,
    fromWorker: true,
  };

  const brunchConfig = await config.loadConfig(opts);
  const watched = brunchConfig.paths.watched.map(getFolderName);

  t.is(getFolderName(brunchConfig.paths.public), 'tmp');
  t.deepEqual(watched, ['app', 'test']);
});

test('config: overrides the config using the specified env', async t => {
  const opts = {
    env: 'meh',
    config: path.join(__dirname, './fixtures/config-with-overrides.js'),
    persistent: false,
    fromWorker: true,
  };

  const brunchConfig = await config.loadConfig(opts);
  const watched = brunchConfig.paths.watched.map(getFolderName);

  t.is(brunchConfig.paths.public, 'public');
  t.deepEqual(watched, ['app', 'test']);
});

test('config: removes trailing slash from paths', async t => {
  const opts = {
    config: path.join(__dirname, './fixtures/config-with-trailing-slashes.js'),
    persistent: false,
    fromWorker: true,
  };

  const brunchConfig = await config.loadConfig(opts);

  t.deepEqual(brunchConfig.paths.watched, [
    'app/assets',
  ]);
  t.is(brunchConfig.paths.public, 'app/builds');
});
