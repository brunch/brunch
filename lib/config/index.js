'use strict';
const sysPath = require('universal-path');
const validate = require('./validate');
const {deepAssign, removeFrom, deepFreeze} = require('../utils');

const applyOverrides = config => {
  const styles = config.files.stylesheets;
  const {isMergeable, wasChanged} = deepAssign;

  styles[isMergeable] = ['joinTo', 'entryPoints'];
  styles[wasChanged] = key => {
    switch (key) {
      case 'joinTo':
        delete styles.entryPoints;
        break;

      case 'entryPoints':
        delete styles.joinTo;
        break;
    }
  };

  const {plugins} = config;
  plugins[wasChanged] = key => {
    switch (key) {
      case 'on':
        removeFrom(plugins.off, plugins.on);
        break;

      case 'off':
        removeFrom(plugins.on, plugins.off);
        break;
    }
  };

  config.envs.forEach(env => {
    const override = config.overrides[env];
    deepAssign(config, override);
  });
};

const joinPaths = paths => {
  const join = path => {
    if (!sysPath.isAbsolute(path)) {
      path = sysPath.join(paths.root, path);
    }

    return path.replace(/\/$/, '');
  };

  paths.public = join(paths.public);
  paths.watched = paths.watched.map(join);
  paths.packageConfig = join(paths.packageConfig);
};

const normConventions = conv => {
  const {ignored, assets, vendor} = conv;

  conv.assets = p => !vendor(p) && assets(p);
  conv.ignored = p => !vendor(p) && ignored(p);
};

const setLoggyOptions = notify => {
  const logger = require('loggy');

  if (notify === false) {
    logger.notifications = false;
  } else {
    Object.assign(logger.notifications, notify);
  }
};

const setAWF = watcher => {
  if (watcher.awaitWriteFinish === true) {
    watcher.awaitWriteFinish = {
      stabilityThreshold: 50,
      pollInterval: 10,
    };
  }
};

module.exports = config => {
  const valid = validate(config);

  applyOverrides(valid);
  joinPaths(valid.paths);
  normConventions(valid.conventions);
  setLoggyOptions(valid.notifications);
  setAWF(valid.watcher);

  valid.server.publicPath = valid.paths.public;

  return deepFreeze(valid);
};
