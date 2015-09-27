'use strict';
var slice = [].slice,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
const fs = require('fs');
const each = require('async-each');
const waterfall = require('async-waterfall');
const chokidar = require('chokidar');
const debug = require('debug')('brunch:watch');
const sysPath = require('path');
const spawn = require('child_process').spawn;
const logger = require('loggy');
const pushserve = require('pushserve');

/* Worker must be loaded before fs_utils. */
const worker = require('./worker');
const fs_utils = require('./fs_utils');
const helpers = require('./helpers');

const exists = (path, callback) => {
  fs.access(path, error => callback(undefined, !error));
};

/* Get paths to files that plugins include. E.g. handlebars-brunch includes
 * `../vendor/handlebars-runtime.js` with path relative to plugin.
 *
 * plugins - Array of brunch plugins.
 *
 * Returns Array of Strings.
 */

const getPluginIncludes = plugins => {
  const getValue = (thing, context) => {
    if (context == null) context = this;
    return typeof thing === 'function' ? thing.call(context) : thing;
  };
  const ensureArray = object => Array.isArray(object) ? object : [object];
  return plugins
  .map(plugin => getValue(plugin.include, plugin))
  .filter(paths => paths != null)
  .reduce((acc, elem) => { return acc.concat(ensureArray(elem)); }, []);
};


/* Generate function that will check if object has property and it is a fn.
 * Returns Function.
 */

const propIsFunction = prop => {
  return object => {
    return typeof object[prop] === 'function';
  };
};


/* Generate params that will be used as default config values.
 *
 * persistent - Boolean. Determines if brunch should run a web server.
 * options    - Object. {optimize, publicPath, server, port}.
 *
 * Returns Object.
 */

const generateParams = (persistent, options) => {
  const env = options.env;
  const params = {
    env: (env && env.split(',')) || []
  };
  if ((options.production != null) || (options.optimize != null)) {
    params.env.unshift('production');
  }
  params.persistent = persistent;
  params.stdin = options.stdin != null;
  if (options.publicPath) {
    params.paths = {};
    params.paths["public"] = options.publicPath;
  }
  if (persistent) {
    params.server = {};
    if (options.server) {
      params.server.run = true;
    }
    if (options.port) {
      params.server.port = options.port;
    }
  }
  return params;
};

const startServer = (config, callback) => {
  var child, commandComponents, customServerTimeout, error, error1, opts, port, publicPath, server, serverCb, serverConfig, serverFn, serverOpts;
  if (callback == null) {
    callback = () => {};
  }
  serverOpts = config.server || {};
  port = parseInt(config.server.port, 10);
  publicPath = config.paths["public"];
  serverCb = () => {
    clearTimeout(customServerTimeout);
    logger.info(config.server.path || config.server.command ? 'custom server started, initializing watcher' : "application started on http://localhost:" + port + "/");
    callback();
  };
  if (config.server.path) {
    logger.info('starting custom server');
    try {
      server = require(sysPath.resolve(config.server.path));
    } catch (error1) {
      error = error1;
      logger.error("couldn't load server " + config.server.path + ": " + error);
    }
    serverFn = (() => {
      if (typeof server === 'function') {
        return server;
      } else if (server && typeof server.startServer === 'function') {
        return server.startServer.bind(server);
      } else {
        throw new Error('Brunch server file needs to have startServer function');
      }
    })();
    opts = {
      port: port,
      path: publicPath
    };
    serverConfig = helpers.extend(opts, serverOpts.config || {});
    debug("Invoking custom startServer with: " + (JSON.stringify(serverConfig)));
    customServerTimeout = setTimeout(() => {
      logger.warn('custom server taking a long time to start');
      return logger.warn('**don\'t forget to invoke callback()**');
    }, 5000);
    switch (serverFn.length) {
      case 1:
        return serverFn(serverCb);
      case 2:
        return serverFn(serverConfig, serverCb);
      default:
        return serverFn(port, publicPath, serverCb);
    }
  } else if (config.server.command) {
    commandComponents = config.server.command.split(' ');
    debug("Invoking custom server command with: " + config.server.command);
    if (!commandComponents.length) {
      throw new Error('Custom server command invalid');
    }
    child = spawn(commandComponents.shift(), commandComponents, {
      stdio: 'inherit'

      /* fn to kill the custom server */
    });
    child.close = cb => {
      child.kill();
      return typeof cb === "function" ? cb() : undefined;
    };
    serverCb();
    return child;
  } else {
    opts = {
      noLog: true,
      path: publicPath
    };
    return pushserve(helpers.extend(opts, serverOpts), serverCb);
  }
};


/* Filter paths that exist and watch them with `chokidar` package.
 *
 * config   - application config
 * callback - Function that will take (error, `chokidar.FSWatcher` instance).
 *
 * Returns nothing.
 */

const initWatcher = (config, callback) => {
  const configs = config._normalized.paths.allConfigFiles;
  const pkg = config._normalized.packageInfo;
  const getFiles = pkgs => {
    return [].concat.apply([], pkgs.components.map(_ => _.files));
  };
  const watched = config.paths.watched.concat(
    configs, getFiles(pkg.npm),
    getFiles(pkg.bower), getFiles(pkg.component)
  );
  each(watched, exists, (err, existing) => {
    const watchedFiles = watched.filter((f, index) => existing[index]);
    const params = {
      ignored: fs_utils.ignored,
      persistent: config.persistent,
      usePolling: config.watcher && config.watcher.usePolling
    };
    callback(null, chokidar.watch(watchedFiles, params));
  });
};


/* Generate function that will check if plugin can work with file.
 *
 * path   - Path to source file that can be compiled with plugin
 * plugin - Brunch plugin instance.
 *
 * Returns Function.
 */

const _getPattern = plugin => {
  if (plugin.pattern) {
    return plugin.pattern;
  } else if (plugin.extension) {
    return RegExp("\\." + plugin.extension + "$");
  } else {
    /* never match */
    return /$0^/;
  }
}
const isPluginFor = path => {
  return plugin => _getPattern(plugin).test(path);
};


/* Determine which compiler should be used for path and
 * emit `change` event.
 *
 * compilers - Array. Brunch plugins that were treated as compilers.
 * linters   - Array. Brunch plugins that were treated as linters.
 * fileList  - fs_utils.FileList instance.
 * path      - String. Path to file that was changed.
 * isHelper  - Boolean. Is current file included with brunch plugin?
 *
 * Returns nothing.
 */
const changeFileList = (compilers, linters, fileList, path, isHelper) => {
  const compiler = compilers.filter(isPluginFor(path));
  const currentLinters = linters.filter(isPluginFor(path));
  fileList.emit('change', path, compiler, currentLinters, isHelper);
};

const generateCompilationLog = (startTime, allAssets, generatedFiles, disposedFiles) => {

  /* compiled 4 files and 145 cached files into app.js
   * compiled app.js and 10 cached files into app.js, copied 2 files
   * `compiled 106 into 3 and copied 47 files` - initial compilation
   * `copied img.png` - 1 new/changed asset
   * `copied 6 files` - >1 new/changed asset
   * `compiled controller.coffee and 32 cached files into app.js` - change 1 source file
   * `compiled _partial.styl and 22 cached into 2 files` - change 1 partial affecting >1 compiled file
   * `compiled init.ls into init.js` - change 1 source file that doesn't concat with any other files
   * `compiled 5 files into ie7.css` - change all source files that go into 1 compiled
   * `compiled 2 and 3 cached files into ie7.css` - change some source files that go into 1 compiled
   * `compiled 4 files and 1 cached into ie7.css` - 1 cached should not switch to filename
   * `compiled 5 and 101 cached into 3 files` - change >1 affecting >1 compiled
   */
  var assetsLog, cachedCount, cachedCountName, cachedLog, compiled, compiledCount, compiledLog, copied, copiedCount, dgen, diff, disposedCount, generated, generatedLog, getName, main, nonAssetsLog, noun, sep;
  getName = file => {
    return sysPath.basename(file.path);
  };
  copied = allAssets.filter(_ => {
    return _.copyTime > startTime;
  }).map(getName);
  generated = [];
  compiled = [];
  cachedCount = 0;
  dgen = disposedFiles.generated;
  generatedFiles.forEach(generatedFile => {
    var isChanged, locallyCompiledCount;
    isChanged = false;
    locallyCompiledCount = 0;
    generatedFile.sourceFiles.forEach(sourceFile => {
      var sourceName;
      if (sourceFile.compilationTime >= startTime) {
        isChanged = true;
        locallyCompiledCount += 1;
        sourceName = getName(sourceFile);
        if (compiled.indexOf(sourceName) === -1) {
          compiled.push(sourceName);
        }
      }
      if (!isChanged && dgen.indexOf(generatedFile) >= 0) {
        return isChanged = true;
      }
    });
    if (isChanged) {
      generated.push(getName(generatedFile));
      return cachedCount += generatedFile.sourceFiles.length - locallyCompiledCount;
    }
  });
  compiledCount = compiled.length;
  copiedCount = copied.length;
  disposedCount = disposedFiles.sourcePaths.length;
  generatedLog = (() => {
    switch (generated.length) {
      case 0:
        return '';
      case 1:
        return " into " + generated[0];
      default:
        return " into " + generated.length + " files";
    }
  })();
  compiledLog = (() => {
    switch (compiledCount) {
      case 0:
        switch (disposedCount) {
          case 0:
            return '';
          case 1:
            return "removed " + disposedFiles.sourcePaths[0];
          default:
            return "removed " + disposedCount;
        }
        break;
      case 1:
        return "compiled " + compiled[0];
      default:
        return "compiled " + compiledCount;
    }
  })();
  cachedLog = (() => {
    switch (cachedCount) {
      case 0:
        if (compiledCount <= 1) {
          return '';
        } else {
          return ' files';
        }
        break;
      default:
        switch (compiledCount) {
          case 0:
            noun = generated.length > 1 ? '' : ' files';
            return " and wrote " + cachedCount + " cached" + noun;
          case 1:
            cachedCountName = "file" + (cachedCount === 1 ? '' : 's');
            return " and " + cachedCount + " cached " + cachedCountName;
          default:
            return " files and " + cachedCount + " cached";
        }
    }
  })();
  nonAssetsLog = compiledLog + cachedLog + generatedLog;
  sep = nonAssetsLog && copiedCount !== 0 ? ', ' : '';
  assetsLog = (() => {
    switch (copiedCount) {
      case 0:
        return '';
      case 1:
        return "copied " + copied[0];
      default:
        if (compiled.length === 0) {
          return "copied " + copiedCount + " files";
        } else {
          return "copied " + copiedCount;
        }
    }
  })();
  main = nonAssetsLog + sep + assetsLog;
  diff = Date.now() - startTime;
  return (main ? main : 'compiled') + " in " + diff + "ms";
};


/* Generate function that consolidates all needed info and generate files.
 *
 * config     - Object. Application config.
 * joinConfig - Object. Generated from app config by `getJoinConfig()`
 * fileList   - `fs_utils.FileList` instance.
 * optimizers  - Array. Brunch plugins that are treated as optimizers.
 * watcher    - `chokidar.FSWatcher` instance.
 * callback   - Function. Will receive an array of `fs_utils.GeneratedFile`.
 * startTime  - Number. Timestamp of a moment when compilation started.
 *
 * Returns Function.
 */

const getCompileFn = (config, joinConfig, fileList, optimizers, watcher, preCompile, callback) => {
  return (startTime, watcherReady) => {
    var assetErrors, writeCb;
    assetErrors = fileList.getAssetErrors();
    if (assetErrors != null) {
      assetErrors.forEach(error => {
        return logger.error(error);
      });
      return;
    }

    /* Determine which files has been changed,
     * create new `fs_utils.GeneratedFile` instances and write them.
     */
    writeCb = (error, generatedFiles, disposed) => {
      if (error != null) {
        if (Array.isArray(error)) {
          error.forEach(subError => {
            return logger.error(subError);
          });
        } else {
          logger.error(error);
        }
      } else {
        logger.info(generateCompilationLog(startTime, fileList.assets, generatedFiles, disposed));

        /* pass `fs_utils.GeneratedFile` instances to callbacks. */
        callback(generatedFiles);
      }
      if (!watcherReady) {
        return;
      }

      /* If it’s single non-continuous build, close file watcher and
       * exit process with correct exit code.
       */
      if (!config.persistent) {
        watcher.close();
        worker.close();
        process.on('exit', previousCode => {
          return process.exit((logger.errorHappened ? 1 : previousCode));
        });
      }
      return fileList.initial = false;
    };
    if (preCompile) {
      return preCompile(error => {
        if (error != null) {
          return logger.error(error);
        } else {
          return fs_utils.write(fileList, config, joinConfig, optimizers, startTime, writeCb);
        }
      });
    } else {
      return fs_utils.write(fileList, config, joinConfig, optimizers, startTime, writeCb);
    }
  };
};


/* Generate function that restarts brunch process.
 *
 * config    - application config.
 * options   - options that would be passed to new watcher.
 * onCompile - callback that will be passed to new watcher.
 * watcher   - chokidar.FSWatcher instance that has `close()` method.
 * server    - instance of HTTP server that has `close()` method.
 * plugins   - brunch plugins.
 * reInstall - should brunch run `npm install` before rewatching?
 *
 * Returns Function.
 */

const getReloadFn = (config, options, onCompile, watcher, server, plugins) => {
  return reInstall => {
    var reWatch;
    reWatch = () => {
      var restart;
      restart = () => {
        watcher.close();
        worker.close();
        return watch(config.persistent, null, options, onCompile);
      };
      plugins.forEach(plugin => {
        return typeof plugin.teardown === "function" ? plugin.teardown() : undefined;
      });
      if (server && typeof server.close === 'function') {
        return server.close(restart);
      } else {
        return restart();
      }
    };
    if (reInstall) {
      return helpers.install(config.paths.root, 'npm', reWatch);
    } else {
      logger.info("Reloading watcher...");
      return reWatch();
    }
  };
};

const getPlugins = (packages, config) => {
  var exts;
  exts = config.workers && config.workers.extensions;
  return packages.filter(plugin => {
    return plugin && plugin.prototype && plugin.prototype.brunchPlugin;
  }).filter(plugin => {
    if (worker.isWorker && exts && exts.indexOf(plugin.prototype.extension) === -1) {
      return false;
    }
    return !worker.isWorker || plugin.prototype.compile || plugin.prototype.lint;
  }).map(plugin => {
    var instance;
    instance = new plugin(config);
    instance.brunchPluginName = plugin.brunchPluginName;
    return instance;
  });
};

const loadPackages = (rootPath, callback) => {
  var devPlugins, err, error1, json, loadDeps, nodeModules, optPlugins, packagePath, plugins;
  rootPath = sysPath.resolve(rootPath);
  nodeModules = rootPath + "/node_modules";
  try {
    packagePath = sysPath.join(rootPath, 'package.json');
    delete require.cache[require.resolve(packagePath)];
    json = require(packagePath);
  } catch (error1) {
    err = error1;
    throw new Error("Current directory is not brunch application root path, as it does not contain package.json (" + err + ")");
  }

  /* TODO: test if `brunch-plugin` is in dep’s package.json. */
  loadDeps = (deps, isDev) => {
    var requireModule;
    requireModule = (depPath, dependencyName) => {
      var plugin;
      plugin = require(depPath);
      plugin.brunchPluginName = dependencyName;
      return plugin;
    };
    return deps.filter(dependency => {
      return dependency !== 'brunch' && dependency.indexOf('brunch') !== -1;
    }).map(dependency => {
      var depPath, e, error, error2, error3;
      depPath = nodeModules + "/" + dependency;
      if (isDev) {
        try {
          return requireModule(depPath, dependency);
        } catch (error2) {
          e = error2;
          return null;
        }
      } else {
        try {
          return requireModule(depPath, dependency);
        } catch (error3) {
          error = error3;
          throw new Error("You probably need to execute `npm install` to install brunch plugins. " + error);
        }
      }
    });
  };
  plugins = loadDeps(Object.keys(json.dependencies || {}));
  devPlugins = loadDeps(Object.keys(json.devDependencies || {}), true);
  optPlugins = loadDeps(Object.keys(json.optionalDependencies || {}), true);
  return plugins.concat(devPlugins.concat(optPlugins).filter(_ => {
    return _ != null;
  }));
};


/* Load brunch plugins, group them and initialise file watcher.
 *
 * options      - Object. {config[, optimize, server, port]}.
 * configParams - Object. Optional. Params will be set as default config params.
 * onCompile    - Function. Will be executed after every successful compilation.
 * callback     - Function.
 *
 * Returns nothing.
 */

const initialize = (options, configParams, onCompile, callback) => {

  /* Load config, get brunch packages from package.json. */
  return helpers.loadConfig(options.config, configParams, (error, config) => {
    var alwaysEnabled, callCompileCallbacks, callPreCompillers, callbacks, compilers, fileList, joinConfig, launchWatcher, linters, offPlugins, onlyPlugins, optimizers, packages, plugins, preCompilers, server, unfiltered;
    logger.notifications = config.notifications;
    logger.notificationsTitle = config.notificationsTitle || 'Brunch';
    if (options.config != null) {
      logger.warn('`-c, --config` option is deprecated. Use `--env` and `config.overrides` instead');
    }
    if (options.optimize != null) {
      logger.warn('`-o, --optimize` option is deprecated. Use `-P, --production` instead');
    }
    joinConfig = config._normalized.join;
    offPlugins = config.plugins.off || [];
    onlyPlugins = config.plugins.only || [];
    packages = (loadPackages('.')).filter(arg => {
      var brunchPluginName;
      brunchPluginName = arg.brunchPluginName;
      if (offPlugins.length && offPlugins.indexOf(brunchPluginName) >= 0) {
        return false;
      } else if (onlyPlugins.length && onlyPlugins.indexOf(brunchPluginName) === -1) {
        return false;
      } else {
        return true;
      }
    });
    unfiltered = getPlugins(packages, config);
    alwaysEnabled = config.plugins.on || [];
    plugins = unfiltered.filter(plugin => {

      /* Backward compatibility for legacy optimizers. */
      var env;
      if (typeof plugin.minify === 'function') {
        if (plugin.optimize == null) {
          plugin.optimize = plugin.minify;
        }
      }

      /* Does the user's config say this plugin should definitely be used? */
      if (alwaysEnabled.length && alwaysEnabled.indexOf(plugin.brunchPluginName) >= 0) {
        return true;
      }

      /* If the plugin is an optimizer that doesn't specify a defaultEnv
       * decide based on the config.optimize setting
       */
      if (plugin.optimize && !plugin.defaultEnv) {
        return config.optimize;
      }

      /* Use plugin-specified defaultEnv or assume it's meant for any env */
      env = plugin.defaultEnv != null ? plugin.defaultEnv : plugin.defaultEnv = '*';

      /* Finally, is it meant for either any environment or an active environment? */
      return env === '*' || config.env.indexOf(env) >= 0;
    });
    debug("Loaded plugins: " + (plugins.map(plugin => {
      return plugin.brunchPluginName;
    }).join(', ')));

    /* Get compilation methods. */
    compilers = plugins.filter(propIsFunction('compile'));
    linters = plugins.filter(propIsFunction('lint'));
    optimizers = plugins.filter(propIsFunction('optimize'));

    /* Get plugin preCompile callbacks. */
    preCompilers = plugins.filter(propIsFunction('preCompile')).map(plugin => {
      // => don't support arguments.
      return function() {
        var args, cb, i;
        args = 2 <= arguments.length ?
          slice.call(arguments, 0, i = arguments.length - 1) :
            (i = 0, []), cb = arguments[i++];
        return plugin.preCompile(cb);
      };
    });

    /* Add preCompile callback from config. */
    if (typeof config.preCompile === 'function') {
      // => don't support arguments.
      preCompilers.push(function() {
        var args, cb, i;
        args = 2 <= arguments.length ? slice.call(arguments, 0, i = arguments.length - 1) : (i = 0, []), cb = arguments[i++];
        return config.preCompile(cb);
      });
    }
    callPreCompillers = cb => {
      return waterfall(preCompilers, cb);
    };

    /* Get plugin onCompile callbacks. */
    callbacks = plugins.filter(propIsFunction('onCompile')).map(plugin => {
      return function() {
        var args;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return plugin.onCompile.apply(plugin, args);
      };
    });

    /* Add onCompile callback from config. */
    if (typeof config.onCompile === 'function') {
      callbacks.push(config.onCompile);
    }

    /* Add default brunch callback. */
    callbacks.push(onCompile);
    callCompileCallbacks = generatedFiles => {
      callbacks.forEach(cb => {
        cb(generatedFiles);
      });
    };
    fileList = new fs_utils.FileList(config);
    if (worker.isWorker) {
      return callback(null, {
        config: config,
        fileList: fileList,
        compilers: compilers,
        linters: linters
      });
    }
    launchWatcher = () => {

      /* Initialise file watcher. */
      return initWatcher(config, (error, watcher) => {
        var compile, includes, reload;
        if (error != null) {
          return callback(error);
        }

        /* Get compile and reload functions. */
        compile = getCompileFn(config, joinConfig, fileList, optimizers, watcher, callPreCompillers, callCompileCallbacks);
        reload = getReloadFn(config, options, onCompile, watcher, server, plugins);
        includes = getPluginIncludes(plugins);
        return callback(error, {
          config: config,
          watcher: watcher,
          server: server,
          fileList: fileList,
          compilers: compilers,
          linters: linters,
          compile: compile,
          reload: reload,
          includes: includes
        });
      });
    };
    if (config.persistent && config.server.run) {
      return server = startServer(config, launchWatcher);
    } else {
      return launchWatcher();
    }
  });
};

/* Binds needed events to watcher.
 *
 * config    - application config.
 * fileList  - `fs_utils.FileList` instance.
 * compilers - array of brunch plugins that can compile source code.
 * watcher   - `chokidar.FSWatcher` instance.
 * reload    - function that will reload the whole thing.
 * onChange  - callback that will be executed every time any file is changed.
 *
 * Returns nothing.
 */

const bindWatcherEvents = (config, fileList, compilers, linters, watcher, reload, onChange) => {
  var bowerConfig, changeHandler, jsonConfigs, packageConfig, possibleConfigFiles, ref;
  possibleConfigFiles = config._normalized.paths.possibleConfigFiles;
  ref = config.paths, packageConfig = ref.packageConfig, bowerConfig = ref.bowerConfig;
  jsonConfigs = [packageConfig, bowerConfig];
  changeHandler = path => {
    onChange();
    return changeFileList(compilers, linters, fileList, path, false);
  };
  if (config.persistent && config.stdin) {
    process.stdin.on('end', () => { process.exit(0); });
    process.stdin.resume();
  }
  watcher
    .on('error', logger.error)
    .on('add', absPath => {
      const path = sysPath.relative(config.paths.root, absPath);
      if (!(possibleConfigFiles[path] || jsonConfigs.indexOf(path) >= 0)) {
        return changeHandler(path);
      }
    })
    .on('change', absPath => {
      const path = sysPath.relative(config.paths.root, absPath);

      /* If file is special (config.coffee, package.json), restart Brunch. */
      const isConfigFile = possibleConfigFiles[path];
      const isPackageFile = path === packageConfig;
      if (isConfigFile || isPackageFile) {
        return reload(isPackageFile);
      } else if (path === bowerConfig) {
        return helpers.install(config.paths.root, 'bower', reload);
      } else {
        return changeHandler(path);
      }
    })
    .on('unlink', absPath => {
      const path = sysPath.relative(config.paths.root, absPath);

      /* If file is special (config.coffee, package.json), exit.
       * Otherwise, just update file list.
       */
      const isConfigFile = possibleConfigFiles[path];
      const isPackageFile = path === packageConfig;
      if (isConfigFile || isPackageFile) {
        logger.info("Detected removal of config.coffee / package.json.\nExiting.");
        process.exit(0);
      } else {
        onChange();
        fileList.emit('unlink', path);
      }
    });
  if (process.env.DEBUG) {
    watcher.on('all', (event, path) => {
      debug("File '" + path + "' received event '" + event + "'");
    });
  }
};


/* persistent - Boolean: should brunch build the app only once or watch it?
 * options    - Object: {configPath, optimize, server, port}. Only configPath is
 *              needed.
 * onCompile  - Function that will be executed after every successful
 *              compilation. May receive an array of `fs_utils.GeneratedFile`.
 *
 * this.config is an application config.
 * this._start is a mutable timestamp that represents latest compilation
 * start time. It is `null` when there are no compilations.
 */

class BrunchWatcher {
  constructor(persistent, options, onCompile) {
    this._endCompilation = bind(this._endCompilation, this);
    this._startCompilation = bind(this._startCompilation, this);
    const _this = this;
    const configParams = generateParams(persistent, options);
    _this._start = Date.now();
    initialize(options, configParams, onCompile, (error, result) => {
      var compile, compilers, config, fileList, includes, linters, reload, watcher;
      if (error != null) {
        return logger.error(error);
      }
      config = result.config, watcher = result.watcher, fileList = result.fileList, compilers = result.compilers, linters = result.linters, compile = result.compile, reload = result.reload, includes = result.includes;
      this.config = config;
      if (config.workers && config.workers.enabled) {
        if (!worker({
          changeFileList: changeFileList,
          compilers: compilers,
          linters: linters,
          fileList: fileList,
          config: config
        })) {
          return;
        }
      }
      bindWatcherEvents(config, fileList, compilers, linters, watcher, reload, this._startCompilation);
      let watcherReady = false;
      watcher.once('ready', () => {
        return watcherReady = true;
      });
      fileList.on('ready', () => {
        if (this._start) {
          return compile(this._endCompilation(), watcherReady);
        }
      });

      /* Emit `change` event for each file that is included with plugins.
       * Wish it worked like `watcher.add includes`.
       */
      return includes.forEach(path => {
        const relative = sysPath.relative(this.config.paths.root, path);
        return changeFileList(compilers, linters, fileList, relative, true);
      });
    });
  }


  /* Set start time of last compilation to current time.
   * Returns Number.
   */
  _startCompilation() {
    const start = this._start || (this._start = Date.now());
    return start;
  }

  /* Get last compilation start time and reset the state.
   * Returns Number.
   */
  _endCompilation() {
    const start = this._start;
    this._start = null;
    return start;
  }
}

const watch = module.exports = (persistent, path, options, callback) => {
  if (callback == null) {
    callback = (() => {});
  }

  /* If path isn't provided (by CL) */
  if (path) {
    if (typeof path === 'string') {
      process.chdir(path);
    } else {
      if (typeof 'options' === 'function') {
        callback = options;
      }
      options = path;
    }
  }
  return new BrunchWatcher(persistent, options, callback);
};
