'use strict';
const promisify = require('./promise').promisify;
const slice = [].slice;
const bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
const fs = require('fs');
const chokidar = require('chokidar');
const debug = require('debug')('brunch:watch');
const sysPath = require('path');
const spawn = require('child_process').spawn;
const logger = require('loggy');
const pushserve = require('pushserve');

/* Worker must be loaded before fs_utils. */
const worker = require('./worker');
const fs_utils = require('./fs_utils');
const application = require('./application');

const fsaccess = promisify(fs.access);
const fsExists = (path) => {
  return fsaccess(path).then(Promise.resolve, err => Promise.resolve(!err));
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
  if (callback == null) callback = () => {};
  const serverOpts = config.server || {};
  const port = parseInt(config.server.port, 10);
  const publicPath = config.paths["public"];
  let customServerTimeout;
  let server;

  const serverCb = () => {
    clearTimeout(customServerTimeout);
    logger.info(config.server.path || config.server.command ? 'custom server started, initializing watcher' : "application started on http://localhost:" + port + "/");
    callback();
  };
  if (config.server.path) {
    logger.info('starting custom server');
    try {
      server = require(sysPath.resolve(config.server.path));
    } catch (error) {
      logger.error("couldn't load server " + config.server.path + ": " + error);
    }
    const serverFn = (() => {
      if (typeof server === 'function') {
        return server;
      } else if (server && typeof server.startServer === 'function') {
        return server.startServer.bind(server);
      } else {
        throw new Error('Brunch server file needs to have startServer function');
      }
    })();
    let opts = {
      port: port,
      path: publicPath
    };
    const serverConfig = Object.assign(opts, serverOpts.config || {});
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
    const commandComponents = config.server.command.split(' ');
    debug("Invoking custom server command with: " + config.server.command);
    if (!commandComponents.length) {
      throw new Error('Custom server command invalid');
    }
    /* fn to kill the custom server */
    const child = spawn(commandComponents.shift(), commandComponents, {
      stdio: 'inherit'
    });
    child.close = cb => {
      child.kill();
      return typeof cb === "function" ? cb() : undefined;
    };
    serverCb();
    return child;
  } else {
    let opts = {
      noLog: true,
      path: publicPath
    };
    return pushserve(Object.assign(opts, serverOpts), serverCb);
  }
};


/* Filter paths that exist and watch them with `chokidar` package.
 *
 * config   - application config
 *
 * Returns nothing.
 */

const initWatcher = (config) => {
  const configs = config._normalized.paths.allConfigFiles;
  const pkg = config._normalized.packageInfo;
  const getFiles = pkgs => {
    return [].concat.apply([], pkgs.components.map(c => c.files));
  };
  const watched = config.paths.watched.concat(
    configs, getFiles(pkg.npm),
    getFiles(pkg.bower), getFiles(pkg.component)
  );

  return Promise.resolve(watched)
    .then(watchedFiles => {
      return watchedFiles.filter(fsExists);
    })
    .then(watchedFiles => {
      const params = {
        ignored: fs_utils.ignored,
        persistent: config.persistent,
        usePolling: config.watcher && config.watcher.usePolling
      };
      return chokidar.watch(watchedFiles, params);
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
};
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
  const getName = file => {
    return sysPath.basename(file.path);
  };
  const copied = allAssets.filter(_ => {
    return _.copyTime > startTime;
  }).map(getName);
  const generated = [];
  const compiled = [];
  let cachedCount = 0;
  const dgen = disposedFiles.generated;
  generatedFiles.forEach(generatedFile => {
    let isChanged = false;
    let locallyCompiledCount = 0;
    generatedFile.sourceFiles.forEach(sourceFile => {
      if (sourceFile.compilationTime >= startTime) {
        isChanged = true;
        locallyCompiledCount += 1;
        const sourceName = getName(sourceFile);
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
  const compiledCount = compiled.length;
  const copiedCount = copied.length;
  const disposedCount = disposedFiles.sourcePaths.length;
  const generatedLog = (() => {
    switch (generated.length) {
      case 0:
        return '';
      case 1:
        return " into " + generated[0];
      default:
        return " into " + generated.length + " files";
    }
  })();
  const compiledLog = (() => {
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
  const cachedLog = (() => {
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
            const noun = generated.length > 1 ? '' : ' files';
            return " and wrote " + cachedCount + " cached" + noun;
          case 1:
            let cachedCountName = "file" + (cachedCount === 1 ? '' : 's');
            return " and " + cachedCount + " cached " + cachedCountName;
          default:
            return " files and " + cachedCount + " cached";
        }
    }
  })();
  const nonAssetsLog = compiledLog + cachedLog + generatedLog;
  const sep = nonAssetsLog && copiedCount !== 0 ? ', ' : '';
  const assetsLog = (() => {
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
  const main = nonAssetsLog + sep + assetsLog;
  const diff = Date.now() - startTime;
  const diffText = diff > 1000 ?
    +(diff / 1000).toFixed(1) + ' sec' :
    diff + 'ms';
  return (main ? main : 'compiled') + " in " + diffText;
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

const getCompileFn = (config, joinConfig, fileList, optimizers, watcher, preCompilers, callback) => {
  return (startTime, watcherReady) => {
    const assetErrors = fileList.getAssetErrors();
    if (assetErrors != null) {
      return assetErrors.forEach(error => logger.error(error));
    }

    /* Determine which files has been changed,
     * create new `fs_utils.GeneratedFile` instances and write them.
     */
    let writeFn = () => {
      return fs_utils.write(fileList, config, joinConfig, optimizers, startTime)
      .then(data => {
          const generatedFiles = data.changed;
          const disposed = data.disposed;
          logger.info(generateCompilationLog(startTime, fileList.assets, generatedFiles, disposed));

          /* pass `fs_utils.GeneratedFile` instances to callbacks. */
          callback(generatedFiles);
        }, error => {
          if (Array.isArray(error)) {
            error.forEach(subError => {
              return logger.error(subError);
            });
          } else {
            logger.error(error);
          }
        })
      .then(() => {
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
        });
    };

    Promise.all(preCompilers)
      .then(writeFn, error => { return logger.error(error) });
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
    const reWatch = () => {
      const restart = () => {
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
      return application.install(config.paths.root, 'npm').then(reWatch, reWatch);
    } else {
      logger.info("Reloading watcher...");
      return reWatch();
    }
  };
};

const getPlugins = (packages, config) => {
  const exts = config.workers && config.workers.extensions;
  return packages.filter(plugin => {
    return plugin && plugin.prototype && plugin.prototype.brunchPlugin;
  }).filter(plugin => {
    if (worker.isWorker && exts && exts.indexOf(plugin.prototype.extension) === -1) {
      return false;
    }
    return !worker.isWorker || plugin.prototype.compile || plugin.prototype.lint;
  }).map(plugin => {
    const instance = new plugin(config);
    instance.brunchPluginName = plugin.brunchPluginName;
    return instance;
  });
};

const loadPackages = (rootPath) => {
  rootPath = sysPath.resolve(rootPath);
  const nodeModules = rootPath + "/node_modules";
  let packagePath, json;
  try {
    packagePath = sysPath.join(rootPath, 'package.json');
    delete require.cache[require.resolve(packagePath)];
    json = require(packagePath);
  } catch (err) {
    throw new Error("Current directory is not brunch application root path, as it does not contain package.json (" + err + ")");
  }

  /* TODO: test if `brunch-plugin` is in dep’s package.json. */
  const loadDeps = (deps, isDev) => {
    const requireModule = (depPath, dependencyName) => {
      const plugin = require(depPath);
      plugin.brunchPluginName = dependencyName;
      return plugin;
    };
    return deps.filter(dependency => {
      return dependency !== 'brunch' && dependency.indexOf('brunch') !== -1;
    }).map(dependency => {
      const depPath = nodeModules + "/" + dependency;
      if (isDev) {
        try {
          return requireModule(depPath, dependency);
        } catch (error) {
          return null;
        }
      } else {
        try {
          return requireModule(depPath, dependency);
        } catch (error) {
          throw new Error("You probably need to execute `npm install` to install brunch plugins. " + error);
        }
      }
    });
  };
  const plugins = loadDeps(Object.keys(json.dependencies || {}));
  const devPlugins = loadDeps(Object.keys(json.devDependencies || {}), true);
  const optPlugins = loadDeps(Object.keys(json.optionalDependencies || {}), true);
  return plugins.concat(devPlugins.concat(optPlugins).filter(p => p != null));
};


/* Load brunch plugins, group them and initialise file watcher.
 *
 * options      - Object. {config[, optimize, server, port]}.
 * configParams - Object. Optional. Params will be set as default config params.
 * onCompile    - Function. Will be executed after every successful compilation.
 *
 * Returns nothing.
 */

const initialize = (options, configParams, onCompile) => {
  let server;
  /* Load config, get brunch packages from package.json. */
  return application.loadConfig(options.config, configParams).then(config => {
    logger.notifications = config.notifications;
    logger.notificationsTitle = config.notificationsTitle || 'Brunch';
    if (options.config != null) {
      logger.warn('`-c, --config` option is deprecated. Use `--env` and `config.overrides` instead');
    }
    if (options.optimize != null) {
      logger.warn('`-o, --optimize` option is deprecated. Use `-P, --production` instead');
    }
    const joinConfig = config._normalized.join;
    const offPlugins = config.plugins.off || [];
    const onlyPlugins = config.plugins.only || [];
    const packages = (loadPackages('.')).filter(arg => {
      const brunchPluginName = arg.brunchPluginName;
      if (offPlugins.length && offPlugins.indexOf(brunchPluginName) >= 0) {
        return false;
      } else if (onlyPlugins.length && onlyPlugins.indexOf(brunchPluginName) === -1) {
        return false;
      } else {
        return true;
      }
    });
    const unfiltered = getPlugins(packages, config);
    const alwaysEnabled = config.plugins.on || [];
    const plugins = unfiltered.filter(plugin => {

      /* Backward compatibility for legacy optimizers. */
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
      const env = plugin.defaultEnv != null ? plugin.defaultEnv : plugin.defaultEnv = '*';

      /* Finally, is it meant for either any environment or an active environment? */
      return env === '*' || config.env.indexOf(env) >= 0;
    });
    debug("Loaded plugins: " + (plugins.map(plugin => {
          return plugin.brunchPluginName;
        }).join(', ')));

    /* Get compilation methods. */
    const compilers = plugins.filter(propIsFunction('compile'));
    const linters = plugins.filter(propIsFunction('lint'));
    const optimizers = plugins.filter(propIsFunction('optimize'));

    /* Get plugin preCompile callbacks. */
    const preCompilers = plugins.filter(propIsFunction('preCompile')).map(plugin => {
      // => don't support arguments.
      return function() {
        let i;
        let args = 2 <= arguments.length ?
            slice.call(arguments, 0, i = arguments.length - 1) :
            (i = 0, []), cb = arguments[i++];
        return plugin.preCompile(cb);
      };
    });

    /* Add preCompile callback from config. */
    if (typeof config.preCompile === 'function') {
      // => don't support arguments.
      preCompilers.push(function() {
        let i;
        let args = 2 <= arguments.length ? slice.call(arguments, 0, i = arguments.length - 1) : (i = 0, []), cb = arguments[i++];
        return config.preCompile(cb);
      });
    }

    /* Get plugin onCompile callbacks. */
    const callbacks = plugins.filter(propIsFunction('onCompile')).map(plugin => {
      return function() {
        const args = slice.call(arguments, 0);
        return plugin.onCompile.apply(plugin, args);
      };
    });

    /* Add onCompile callback from config. */
    if (typeof config.onCompile === 'function') {
      callbacks.push(config.onCompile);
    }

    /* Add default brunch callback. */
    callbacks.push(onCompile);
    const callCompileCallbacks = generatedFiles => {
      callbacks.forEach(cb => cb(generatedFiles));
    };
    const fileList = new fs_utils.FileList(config);
    if (worker.isWorker) {
      return {
        config: config,
        fileList: fileList,
        compilers: compilers,
        linters: linters
      };
    }
    const launchWatcher = () => {
      /* Initialise file watcher. */
      return initWatcher(config).then(watcher => {
        /* Get compile and reload functions. */
        const compile = getCompileFn(config, joinConfig, fileList, optimizers, watcher, preCompilers, callCompileCallbacks);
        const reload = getReloadFn(config, options, onCompile, watcher, server, plugins);
        const includes = getPluginIncludes(plugins);
        return {
          config: config,
          watcher: watcher,
          server: server,
          fileList: fileList,
          compilers: compilers,
          linters: linters,
          compile: compile,
          reload: reload,
          includes: includes
        };
      });
    };
    if (config.persistent && config.server.run) {
      // TODO check this code path
      return new Promise((resolve, reject) => {
        server = startServer(config, error => {
          if (error) reject(error);
          return launchWatcher().then(resolve, reject);
        });
      });
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
  const possibleConfigFiles = config._normalized.paths.possibleConfigFiles;
  const root = config.paths.root;
  const packageConfig = config.paths.packageConfig;
  const bowerConfig = config.paths.bowerConfig;
  const changeHandler = path => {
    onChange();
    changeFileList(compilers, linters, fileList, path, false);
  };

  if (config.persistent && config.stdin) {
    process.stdin.on('end', () => { process.exit(0); });
    process.stdin.resume();
  }
  const isDebug = !!process.env.DEBUG;
  watcher
    .on('error', logger.error)
    .on('add', absPath => {
      if (isDebug) debug(`add ${absPath}`);
      const path = sysPath.relative(root, absPath);
      const isConfigFile = possibleConfigFiles[path];
      const isPackageFile = path === packageConfig;
      if (isConfigFile || isPackageFile || bowerConfig === path) return;
      changeHandler(path);
    })
    .on('change', absPath => {
      if (isDebug) debug(`change ${absPath}`);
      const path = sysPath.relative(root, absPath);
      const isConfigFile = possibleConfigFiles[path];
      const isPackageFile = path === packageConfig;
      if (isConfigFile || isPackageFile) {
        reload(isPackageFile);
      } else if (path === bowerConfig) {
        application.install(root, 'bower').then(reload, reload);
      } else {
        changeHandler(path);
      }
    })
    .on('unlink', absPath => {
      if (isDebug) debug(`unlink ${absPath}`);
      const path = sysPath.relative(root, absPath);
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
    const configParams = generateParams(persistent, options);
    this._start = Date.now();
    initialize(options, configParams, onCompile)
      .then(result => {
        const config = result.config;
        const watcher = result.watcher;
        const fileList = result.fileList;
        const compilers = result.compilers;
        const linters = result.linters;
        const compile = result.compile;
        const reload = result.reload;
        const includes = result.includes;
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
          watcherReady = true;
        });
        fileList.on('ready', () => {
          if (this._start) {
            compile(this._endCompilation(), watcherReady);
          }
        });

        /* Emit `change` event for each file that is included with plugins.
         * Wish it worked like `watcher.add includes`.
         */
        return includes.forEach(path => {
          const relative = sysPath.relative(this.config.paths.root, path);
          changeFileList(compilers, linters, fileList, relative, true);
        });
      })
      .catch(error => logger.error('Initialization error -', error));
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
  if (callback == null) callback = (() => {});

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
