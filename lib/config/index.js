'use strict';
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
  const styles = config.files.stylesheets;
  const {dontMerge, wasChanged} = deepAssign;

  styles[dontMerge] = ['joinTo', 'entryPoints'];
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
  const trim = path => path.replace(/\/$/, '');
  const join = path => {
    if (!sysPath.isAbsolute(path)) {
      path = sysPath.join(paths.root, path);
    }

    return trim(path);
  };

  paths.root = trim(paths.root);
  paths.watched = paths.watched.map(join);
  paths.public = join(paths.public);
  paths.packageConfig = join(paths.packageConfig);
};

const normFiles = files => {
  const js = files.javascripts;
  const jsVendor = js.vendor;
  if (typeof jsVendor === 'string') {
    js.vendor = {
      [jsVendor]: () => true,
    };
  }

  const css = files.stylesheets;
  const cssVendor = css.vendor;
  if (typeof cssVendor === 'string') {
    css.vendor = {
      [cssVendor]: () => true,
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
  const logger = require('loggy');

  if (notify === false) {
    logger.notifications = false;
  } else {
    Object.assign(logger.notifications, notify);
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

  deepAssign(valid.files, {
    javascripts: {
      entryPoints: {},
      vendor: {},
    },
    stylesheets: {
      entryPoints: {},
      vendor: {},
      order: {},
    },
  });

  setProdOverride(valid.overrides);
  applyOverrides(valid);

  joinPaths(valid.paths);
  normFiles(valid.files);
  normCompilers(valid.npm);
  normConventions(valid.conventions);
  setLoggyOptions(valid.notifications);
  redefineAWF(valid.watcher);
  pifyHook(valid.hooks);

  valid.server.publicPath = valid.paths.public;

  return deepFreeze(valid);
};
