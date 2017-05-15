'use strict';
const sysPath = require('universal-path');
const validate = require('./validate');
const {deepAssign, deepFreeze} = require('../helpers');

const dontMerge = files => {
  const values = Object.values(files);

  // this fn will be called on every nested object that will be merged
  return (target, source) => {
    if (!values.includes(target)) return () => true;

    // this fn will be called on every enumerable entry in source
    return key => {
      // if either joinTo or entryPoints is overriden but not both, reset the other, as they are supposed to go hand-in-hand
      const otherKey = key === 'joinTo' ? 'entryPoints' : key === 'entryPoints' ? 'joinTo' : null;
      if (otherKey && otherKey in target && !(otherKey in source)) {
        delete target[otherKey];
      }

      return false;
    };
  };
};

const applyOverrides = config => {
  // if (envs.length) {
  //   // Preserve default config before overriding.
  //   const defaults = config.overrides._default = {};

  //   Object.keys(config).forEach(key => {
  //     if (key === 'overrides') return;
  //     const value = config[key];
  //     if (value !== Object(value)) return;

  //     const override = defaults[key] = {};
  //     deepAssign(override, value);
  //   });
  // }

  for (const [env, val] of Object.entries(config.envs)) {

  }

  envs.forEach(env => {
    const {plugins} = config;
    const overrideProps = config.overrides[env] || {};
    const specials = {on: 'off', off: 'on'};

    // Special override handling for plugins.on|off arrays (gh-826).
    Object.keys(specials).forEach(k => {
      const v = specials[k];
      if (plugins[v]) {
        if (overrideProps.plugins == null) overrideProps.plugins = {};
        const item = overrideProps.plugins[v] || [];
        const cItem = plugins[v] || [];
        overrideProps.plugins[v] = item.concat(cItem.filter(plugin => {
          const list = overrideProps.plugins[k];
          return list && !list.includes(plugin);
        }));
      }
    });
    deepAssign(config, overrideProps, dontMerge(config.files));
  });
};

const normPaths = paths => {
  const norm = path => {
    if (!sysPath.isAbsolute(path)) {
      path = sysPath.join(paths.root, path);
    }

    return path.replace(/\/$/, '');
  };

  paths.public = norm(paths.public);
  paths.watched = paths.watched.map(norm);
  paths.packageConfig = norm(paths.packageConfig);
};

const setLoggyOptions = config => {
  const logger = require('loggy');

  if (config === false) {
    logger.notifications = false;
  } else {
    Object.assign(logger.notifications, config);
  }
};

// Object.assign(norm, {
//   watcher: {
//     usePolling: watcher.usePolling,
//     awaitWriteFinish: watcher.awaitWriteFinish === true ?
//       {stabilityThreshold: 50, pollInterval: 10} :
//       watcher.awaitWriteFinish,
//   },
// });

const normConventions = conv => {
  const {ignored, assets, vendor} = conv;

  conv.assets = p => !vendor(p) && assets(p);
  conv.ignored = p => !vendor(p) && ignored(p);
};

const loadConfig = configPath => {
  try {
    require('coffee-script/register');
  } catch (err) {
    // coffee is optional since 3.0
  }

  try {
    const resolved = sysPath.resolve(configPath);
    return requireClean(resolved);
  } catch (err) {

  }
};

module.exports = config => {

};

const init = (configPath, partConfig) => {
  const config = loadConfig(configPath);
  deepAssign(config, partConfig);
  const valid = validate(config);

  applyOverrides(valid);
  normPaths(valid.paths);
  normConventions(valid.conventions);
  setLoggyOptions(valid.notifications);

  // ensure server's public path takes overrides into account
  valid.server.publicPath = valid.paths.public; // getter heytter?

  return deepFreeze(valid);
};

// module.exports = {
//   norm,
//   init,
// };
