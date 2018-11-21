'use strict';
const loggy = require('loggy');
const sysPath = require('universal-path');
const validate = require('./validate');
const {
  deepAssign,
  deepFreeze,
  removeFrom,
  pifyHook,
} = require('../utils');

const setProdOverride = overrides => {
  deepAssign(overrides, {
    production: {
      sourceMaps: false,
      optimize: true,
    },
  });
};

const applyOverrides = config => {
  const css = config.files.stylesheets;
  const {dontMerge, wasChanged} = deepAssign;

  css[dontMerge] = ['joinTo', 'entryPoints'];
  css[wasChanged] = key => {
    switch (key) {
      case 'joinTo':
        delete css.entryPoints;
        break;

      case 'entryPoints':
        delete css.joinTo;
        delete css.order;
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

  config.env.forEach(env => {
    deepAssign(config, config.overrides[env]);
  });
};

const joinPaths = paths => {
  const trim = path => path.replace(/\/$/, '');
  const join = path => {
    return trim(sysPath.isAbsolute(path)
      ? sysPath.normalize(path)
      : sysPath.join(paths.root, path)
    );
  };

  paths.root = trim(paths.root);
  paths.public = join(paths.public);
  paths.watched = paths.watched.map(join);
};

const normFiles = files => {
  const js = files.javascripts;
  if (typeof js.vendor === 'string') {
    js.vendor = {
      [js.vendor]: () => true,
    };
  }

  const css = files.stylesheets;
  if (typeof css.vendor === 'string') {
    css.vendor = {
      [css.vendor]: () => true,
    };
  }

  const {joinTo} = css;
  if (typeof joinTo === 'string') {
    css.joinTo = {
      [joinTo]: () => true,
    };
  }
};

const normCompilers = npm => {
  if (!Array.isArray(npm.compilers)) return;

  npm.compilers =
  npm.compilers.reduce((obj, name) => {
    obj[name] = () => true;
    return obj;
  }, {});
};

const normConventions = conv => {
  const {ignored, assets, vendor} = conv;

  conv.assets = p => !vendor(p) && assets(p);
  conv.ignored = p => !vendor(p) && ignored(p);
};

const setLoggyOptions = notify => {
  if (notify === false) {
    loggy.notifications = false;
  } else {
    Object.assign(loggy.notifications, notify);
  }
};

const redefineAWF = watcher => {
  if (watcher.awaitWriteFinish === true) {
    watcher.awaitWriteFinish = {
      stabilityThreshold: 50,
      pollInterval: 10,
    };
  }
};

module.exports = config => {
  const valid = validate(config);

  setProdOverride(valid.overrides);
  applyOverrides(valid);

  joinPaths(valid.paths);
  normFiles(valid.files);
  normCompilers(valid.npm);
  normConventions(valid.conventions);
  setLoggyOptions(valid.notifications);
  redefineAWF(valid.watcher);
  pifyHook(valid.hooks);

  valid.server.publicPath = valid.paths.public; // NOT HERE

  return deepFreeze(valid);
};
