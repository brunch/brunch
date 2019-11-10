'use strict';
const {join} = require('path');
const {expect} = require('chai');
const {loadConfig} = require('../lib/utils/config');

describe('config', () => {
  function getFolderName(path) {
    return /([^/]*)\/*$/.exec(path)[1];
  }
  function load(filename, opts = {}) {
    return loadConfig({
      ...opts,
      config: join(__dirname, 'fixtures', filename),
      persistent: false, fromWorker: true
    });
  }
  it('loads the config without overriding', async () => {
    const brunchConfig = await load('config-with-overrides.js');
    const watched = brunchConfig.paths.watched.map(getFolderName);
    expect(getFolderName(brunchConfig.paths.public)).to.equal('tmp');
    expect(watched).to.deep.equal(['app', 'test']);
  });

  it('overrides the config using the specified env', async () => {
    const brunchConfig = await load('config-with-overrides.js', {env: 'meh'});
    const watched = brunchConfig.paths.watched.map(getFolderName);
    expect(brunchConfig.paths.public).to.equal('public');
    expect(watched).to.deep.equal(['app', 'test']);
  });

  it('removes trailing slash from paths', async () => {
    const brunchConfig = await load('config-with-trailing-slashes.js');
    expect(brunchConfig.paths.watched).to.deep.equal(['app/assets']);
    expect(brunchConfig.paths.public).to.equal('app/builds');
  });
});
