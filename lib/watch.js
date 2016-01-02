'use strict';
const slice = [].slice;
const bind = function(fn, me) {
  return function() { return fn.apply(me, arguments); };
};
const fsaccess = require('fs').access;
const chokidar = require('chokidar');
const dbg = require('debug');
const debug = dbg('brunch:watch');
const debugSpeed = dbg('brunch:speed');
const sysPath = require('path');
const spawn = require('child_process').spawn;
const logger = require('loggy');
const pushserve = require('pushserve');

/* Worker must be loaded before fs_utils. */
const worker = require('./worker');
const fsUtils = require('./fs_utils');
const application = require('./application');
const ui = require('./ui');

const brunchPluginPattern = 'brunch'; // To filter brunch plugins.
const longCallbackTime = 4000; // ms.

const fsExists = (path) => {
  return new Promise(resolve => {
    fsaccess(path, (error) => {
      if (error) resolve(false);
      else resolve(true);
    });
  });
};

var profileBrunch = (typeof global.profileBrunch === 'function') ?
  (item => debugSpeed(global.profileBrunch(item)))
  : Function.prototype;

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
const propIsFunction = prop => obj => typeof obj[prop] === 'function';

/* Generate params that will be used as default config values.
 *
 * persistent - Boolean. Determines if brunch should run a web server.
 * options    - Object. {optimize, publicPath, server, port}.
 *
 * Returns Object.
 */

const initParams = (persistent, options) => {
  if (options.config != null) {
    logger.warn('`-c, --config` option is deprecated. ' +
      'Use `--env` and `config.overrides` instead');
  }
  if (options.optimize != null) {
    logger.warn('`-o, --optimize` option is deprecated. ' +
      'Use `-P, --production` instead');
  }

  const env = options.env;
  const params = {
    env: (env && env.split(',')) || []
  };
  if (options.production != null || options.optimize != null) {
    params.env.unshift('production');
  }
  params.persistent = persistent;
  params.stdin = options.stdin != null;
  if (options.publicPath) {
    params.paths = {};
    params.paths.public = options.publicPath;
  }
  if (persistent) {
    params.server = {};
    if (options.server) params.server.run = true;
    if (options.port) params.server.port = options.port;
  }
  return params;
};

const startServer = (config, callback) => {
  if (callback == null) callback = () => {};
  const serverOpts = config.server || {};
  const port = parseInt(serverOpts.port, 10);
  const serverCommand = serverOpts.command;
  const serverPath = serverOpts.path;
  const publicPath = config.paths.public;
  let customServerTimeout;
  let server;

  const serverCb = () => {
    clearTimeout(customServerTimeout);
    const isCustom = serverPath || serverCommand;
    logger.info(isCustom ?
      'custom server started, initializing watcher' :
      `application started on http://localhost:${port}/`
    );
    callback();
  };
  if (serverPath) {
    logger.info('starting custom server');
    try {
      server = require(sysPath.resolve(serverPath));
    } catch (error) {
      logger.error(`couldn't load server ${serverPath}: ${error}`);
    }
    const serverFn = (() => {
      if (typeof server === 'function') {
        return server;
      } else if (server && typeof server.startServer === 'function') {
        return server.startServer.bind(server);
      } else {
        throw new Error('Brunch server file needs to export server function');
      }
    })();
    const opts = {port: port, path: publicPath};
    const serverConfig = Object.assign(opts, serverOpts.config || {});
    debug(`Invoking custom startServer with: ${JSON.stringify(serverConfig)}`);
    customServerTimeout = setTimeout(() => {
      logger.warn('custom server taking a long time to start');
      return logger.warn('**don\'t forget to invoke callback()**');
    }, longCallbackTime);
    switch (serverFn.length) {
      case 1:
        return serverFn(serverCb);
      case 2:
        return serverFn(serverConfig, serverCb);
      default:
        return serverFn(port, publicPath, serverCb);
    }
  } else if (serverCommand) {
    const commandComponents = serverCommand.split(' ');
    debug('Invoking custom server command with: ' + serverCommand);
    if (!commandComponents.length) {
      throw new Error('Custom server command invalid');
    }
    /* fn to kill the custom server */
    const child = spawn(commandComponents.shift(), commandComponents, {
      stdio: 'inherit'
    });
    child.close = cb => {
      child.kill();
      return typeof cb === 'function' ? cb() : undefined;
    };
    serverCb();
    return child;
  } else {
    const opts = {noLog: true, path: publicPath};
    return pushserve(Object.assign(opts, serverOpts), serverCb);
  }
};

const initServer = (config) => {
  if (config.persistent && config.server.run) {
    let server;
    return new Promise((resolve, reject) => {
      server = startServer(config, error => {
        return error ? reject(error) : resolve(server);
      });
    });
  } else {
    return Promise.resolve(false);
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
  const persistent = config.persistent;
  const usePolling = config.watcher && config.watcher.usePolling;
  const getFiles = pkgs => {
    return [].concat.apply([], pkgs.components.map(c => c.files));
  };
  const watched = config.paths.watched.concat(
    configs, getFiles(pkg.npm),
    getFiles(pkg.bower), getFiles(pkg.component)
  );

  return Promise.all(watched.map(fsExists)).then(values => {
    const watchedFiles = watched.filter((path, index) => values[index]);
    return chokidar.watch(watchedFiles, {
      ignored: fsUtils.ignored, persistent: persistent, usePolling: usePolling
    });
  });
};


/* Generate function that will check if plugin can work with file.
 *
 * path   - Path to source file that can be compiled with plugin
 * plugin - Brunch plugin instance.
 *
 * Returns Function.
 */

const _patterns = {};
const _neverMatchRe = /$0^/;
const _getPattern = plugin => {
  const ext = plugin.extension;
  if (plugin.pattern) {
    return plugin.pattern;
  } else if (ext) {
    let re = _patterns[ext];
    if (!re) re = _patterns[ext] = new RegExp('\\.' + ext + '$');
    return re;
  } else {
    return _neverMatchRe;
  }
};

const isPluginFor = path => {
  return plugin => _getPattern(plugin).test(path);
};

/* compiled 4 files and 145 cached files into app.js
 * compiled app.js and 10 cached files into app.js, copied 2 files
 * `compiled 106 into 3 and copied 47 files` - initial compilation
 * `copied img.png` - 1 new/changed asset
 * `copied 6 files` - >1 new/changed asset
 * `compiled controller.coffee and 32 cached files into app.js`
 * `compiled _partial.styl and 22 cached into 2 files` - 1 partial affecting
 *                                                      >1 compiled file
 * `compiled init.ls into init.js` - 1 source file that doesn't
 *                                   concat with any other files
 * `compiled 5 files into ie7.css` - source files that go into 1 compiled
 * `compiled 2 and 3 cached files into ie7.css` - change some source files
 *                                                that go into 1 compiled
 * `compiled 4 files and 1 cached into ie7.css` - one cached should not
 *                                                switch to filename
 * `compiled 5 and 101 cached into 3 files` - change >1 affecting >1 compiled
 */
const genCompilationLog = (startTime, allAssets, generatedFiles, disposedFiles) => {
  const getName = file => {
    return sysPath.basename(file.path);
  };
  const copied = allAssets.filter(a => a.copyTime > startTime).map(getName);
  const generated = [];
  const compiled = [];
  let cachedCount = 0;
  const dgen = disposedFiles.generated;
  generatedFiles.forEach(generatedFile => {
    let isChanged = false;
    let locallyCompiledCount = 0;
    const len = generatedFile.sourceFiles.length;
    generatedFile.sourceFiles.forEach(sourceFile => {
      if (sourceFile.compilationTime >= startTime) {
        isChanged = true;
        locallyCompiledCount += 1;
        const sourceName = getName(sourceFile);
        if (compiled.indexOf(sourceName) === -1) {
          compiled.push(sourceName);
        }
      }
      if (!isChanged && dgen.indexOf(generatedFile) >= 0) isChanged = true;
    });
    if (isChanged) {
      generated.push(getName(generatedFile));
      return cachedCount += len - locallyCompiledCount;
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
        return ' into ' + generated[0];
      default:
        return ' into ' + generated.length + ' files';
    }
  })();
  const compiledLog = (() => {
    switch (compiledCount) {
      case 0:
        switch (disposedCount) {
          case 0:
            return '';
          case 1:
            return 'removed ' + disposedFiles.sourcePaths[0];
          default:
            return 'removed ' + disposedCount;
        }
        break;
      case 1:
        return 'compiled ' + compiled[0];
      default:
        return 'compiled ' + compiledCount;
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
            return ' and wrote ' + cachedCount + ' cached' + noun;
          case 1:
            const cachedCountName = 'file' + (cachedCount === 1 ? '' : 's');
            return ' and ' + cachedCount + ' cached ' + cachedCountName;
          default:
            return ' files and ' + cachedCount + ' cached';
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
        return 'copied ' + copied[0];
      default:
        if (compiled.length === 0) {
          return 'copied ' + copiedCount + ' files';
        } else {
          return 'copied ' + copiedCount;
        }
    }
  })();
  const main = nonAssetsLog + sep + assetsLog;
  const diff = Date.now() - startTime;
  const oneSecond = 1000;
  const diffText = diff > oneSecond ?
    +(diff / oneSecond).toFixed(1) + ' sec' :
    diff + 'ms';
  return (main ? main : 'compiled') + ' in ' + diffText;
};

const getPlugins = (packages, config) => {
  const exts = config.workers && config.workers.extensions;
  const isWorker = worker.isWorker;
  return packages
  .filter(plugin => {
    return plugin && plugin.prototype && plugin.prototype.brunchPlugin;
  })
  .filter(plugin => {
    if (isWorker && exts && exts.indexOf(plugin.prototype.extension) === -1) {
      return false;
    }
    return !isWorker || plugin.prototype.compile || plugin.prototype.lint;
  })
  .map(plugin => {
    const instance = new plugin(config);
    instance.brunchPluginName = plugin.brunchPluginName;
    return instance;
  });
};

const requireModule = (depPath, dependencyName) => {
  const plugin = require(depPath);
  profileBrunch('Loaded plugin ' + dependencyName);
  plugin.brunchPluginName = dependencyName;
  return plugin;
};

const loadPackages = (rootPath) => {
  profileBrunch('Loading plugins');
  rootPath = sysPath.resolve(rootPath);
  const nodeModules = rootPath + '/node_modules';
  let packagePath, json;
  try {
    packagePath = sysPath.join(rootPath, 'package.json');
    delete require.cache[require.resolve(packagePath)];
    json = require(packagePath);
  } catch (err) {
    throw new Error('Current directory is not brunch application root path, ' +
      `as it does not contain package.json (${err})`);
  }

  // Also need to test if `brunch-plugin` is in dep’s package.json.
  const loadDeps = (prop, isDev) => {
    const deps = Object.keys(prop || {});

    return deps.filter(dependency => {
      return dependency !== brunchPluginPattern &&
        dependency.indexOf(brunchPluginPattern) !== -1;
    }).map(dependency => {
      const depPath = nodeModules + '/' + dependency;
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
          throw new Error('You probably need to execute `npm install` ' +
            'to install brunch plugins. ' + error);
        }
      }
    });
  };

  const plugins = loadDeps(json.dependencies);
  const devPlugins = loadDeps(json.devDependencies, true);
  const optPlugins = loadDeps(json.optionalDependencies, true);
  const allPlugins = plugins.concat(devPlugins, optPlugins);

  return allPlugins.filter(p => p != null);
};

/* Load brunch plugins, group them and initialise file watcher.
 *
 * options      - Object. {config[, optimize, server, port]}.
 * configParams - Object. Optional. Params will be set as default config items.
 * onCompile    - Function. Will be executed after each successful compilation.
 *
 * Returns nothing.
 */

const initPlugins = (config, onCompile) => {
  profileBrunch('Loaded config');
  logger.notifications = config.notifications;
  logger.notificationsTitle = config.notificationsTitle || 'Brunch';
  const black = config.plugins.off || [];
  const white = config.plugins.only || [];
  const packages = loadPackages('.').filter(arg => {
    const brunchPluginName = arg.brunchPluginName;
    if (black.length && black.indexOf(brunchPluginName) >= 0) {
      return false;
    } else if (white.length && white.indexOf(brunchPluginName) === -1) {
      return false;
    } else {
      return true;
    }
  });
  const unfiltered = getPlugins(packages, config);
  const alwaysP = config.plugins.on || [];
  const plugins = unfiltered.filter(plugin => {

    /* Backward compatibility for legacy optimizers. */
    if (typeof plugin.minify === 'function') {
      if (plugin.optimize == null) {
        plugin.optimize = plugin.minify;
      }
    }

    /* Does the user's config say this plugin should definitely be used? */
    if (alwaysP.length && alwaysP.indexOf(plugin.brunchPluginName) >= 0) {
      return true;
    }

    /* If the plugin is an optimizer that doesn't specify a defaultEnv
     * decide based on the config.optimize setting
     */
    if (plugin.optimize && !plugin.defaultEnv) {
      return config.optimize;
    }

    /* Use plugin-specified defaultEnv or assume it's meant for any env */
    if (plugin.defaultEnv == null) plugin.defaultEnv = '*';
    const env = plugin.defaultEnv;

    // Finally, is it meant for either any environment or
    // an active environment?
    return env === '*' || config.env.indexOf(env) >= 0;
  });
  debug('Loaded plugins: ' + (plugins.map(plugin => {
    return plugin.brunchPluginName;
  }).join(', ')));

  /* Get compilation methods. */
  const compilers = plugins.filter(propIsFunction('compile'));
  const linters = plugins.filter(propIsFunction('lint'));
  const optimizers = plugins.filter(propIsFunction('optimize'));
  const teardowners = plugins.filter(propIsFunction('teardown'));

  /* Get plugin preCompile callbacks. */
  const preCompilers = plugins.filter(propIsFunction('preCompile'))
  .map(plugin => {
    // => don't support arguments.
    return function() {
      let i = 2 <= arguments.length ? arguments.length - 1 : 0;
      const cb = arguments[i++];
      return plugin.preCompile(cb);
    };
  });

  /* Add preCompile callback from config. */
  if (typeof config.preCompile === 'function') {
    // => don't support arguments.
    preCompilers.push(function() {
      let i = 2 <= arguments.length ? arguments.length - 1 : 0;
      const cb = arguments[i++];
      return config.preCompile(cb);
    });
  }

  /* Get plugin onCompile callbacks. */
  const callbacks = plugins.filter(propIsFunction('onCompile'))
  .map(plugin => {
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
  const teardownBrunch = () => {
    teardowners.forEach(plugin => plugin.teardown());
  };
  if (worker.isWorker) {
    return {
      config: config,
      fileList: new fsUtils.FileList(config),
      compilers: compilers,
      linters: linters
    };
  }
  profileBrunch('Loaded plugins');
  return Promise.resolve({
    compilers: compilers,
    linters: linters,
    includes: getPluginIncludes(plugins),
    teardownBrunch: teardownBrunch,
    optimizers: optimizers,
    preCompilers: preCompilers,
    callCompileCallbacks: callCompileCallbacks
  });
};

/* persistent - Boolean: should brunch build the app only once or watch it?
 * options    - Object: {configPath, optimize, server, port}.
 *              Only configPath is required.
 * onCompile  - Function that will be executed after every successful
 *              compilation. May receive an array of `fs_utils.GeneratedFile`.
 *
 * this.config is an application config.
 * this._start is a mutable timestamp that represents latest compilation
 * start time. It is `null` when there are no compilations.
 */

const setProp = (obj, name) => result => (obj[name] = result);

class BrunchWatcher {
  constructor(persistent, options, onCompile) {
    profileBrunch('Created BrunchWatcher');
    this._constructorOptions = [persistent, options, onCompile];
    const cfgParams = initParams(persistent, options);
    this._endCompilation = bind(this._endCompilation, this);
    this._startCompilation = bind(this._startCompilation, this);
    this._start = Date.now();

    application.loadConfig(options.config, cfgParams).then(setProp(this, 'config'))
      .then(cfg => {
        this.fileList = new fsUtils.FileList(cfg);
        return Promise.all([
          initWatcher(cfg).then(setProp(this, 'watcher')),
          initServer(cfg).then(setProp(this, 'server')),
          initPlugins(cfg, onCompile).then(setProp(this, 'plugins'))
        ]);
      })
      .then(() => this.initCompilation())
      .catch(error => logger.error('Initialization error -', error.stack));
  }

  initCompilation() {
    const pluginIncludes = this.plugins.includes;

    if (this.config.workers && this.config.workers.enabled && !worker({
      changeFileList: this.changeFileList,
      compilers: this.plugins.compilers,
      linters: this.plugins.linters,
      fileList: this.fileList,
      config: this.config
    })) {
      return;
    }
    this.initWatcherEvents();
    profileBrunch('Loaded watcher');
    let watcherReady = false;
    this.watcher.once('ready', () => {
      watcherReady = true;
    });
    this.fileList.on('ready', () => {
      if (!this._start) return;
      this.compile(this._endCompilation(), watcherReady);
    });
    this.fileList.on('bundled', () => this._endBundle());

    // Emit `change` event for each file that is included with plugins.
    // Wish it worked like `watcher.add includes`.
    const rootPath = this.config.paths.root;
    pluginIncludes.forEach(path => {
      this.changeFileList(sysPath.relative(rootPath, path), true);
    });
  }

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
  initWatcherEvents() {
    const isDebug = !!process.env.DEBUG;
    const reload = this.reloadBrunch.bind(this);
    const config = this.config;
    const possibleConfigFiles = config._normalized.paths.possibleConfigFiles;
    const rootPath = config.paths.root;
    const packageConfig = config.paths.packageConfig;
    const bowerConfig = config.paths.bowerConfig;
    const hasStdin = config.persistent && config.stdin;

    const changeHandler = path => {
      this._startCompilation();
      this.changeFileList(path, false);
    };

    if (hasStdin) {
      process.stdin.on('end', () => process.exit(0));
      process.stdin.resume();
    }
    this.watcher
      .on('error', logger.error)
      .on('add', absPath => {
        if (isDebug) debug(`add ${absPath}`);
        const path = sysPath.relative(rootPath, absPath);
        const isConfigFile = possibleConfigFiles[path];
        const isPackageFile = path === packageConfig;
        if (isConfigFile || isPackageFile || bowerConfig === path) return;
        changeHandler(path);
      })
      .on('change', absPath => {
        if (isDebug) debug(`change ${absPath}`);
        const path = sysPath.relative(rootPath, absPath);
        const isConfigFile = possibleConfigFiles[path];
        const isPackageFile = path === packageConfig;
        if (isConfigFile || isPackageFile) {
          reload(isPackageFile);
        } else if (path === bowerConfig) {
          application.install(rootPath, 'bower').then(reload, reload);
        } else {
          changeHandler(path);
        }
      })
      .on('unlink', absPath => {
        if (isDebug) debug(`unlink ${absPath}`);
        const path = sysPath.relative(rootPath, absPath);
        const isConfigFile = possibleConfigFiles[path];
        const isPackageFile = path === packageConfig;
        if (isConfigFile) {
          logger.info('Detected removal of config.coffee\nExiting.');
          process.exit(0);
        } else if (isPackageFile) {
          logger.info('Detected removal of package.json.\nExiting.');
          process.exit(0);
        } else {
          this._startCompilation();
          this.fileList.emit('unlink', path);
        }
      });
  }

  reloadBrunch(reInstall) {
    const restart = () => {
      this.watcher.close();
      worker.close();
      const opts = this._constructorOptions;
      return new BrunchWatcher(opts[0], opts[1], opts[2]);
    };

    const reWatch = () => {
      logger.info('Reloading watcher...');
      this.plugins.teardownBrunch();
      const server = this.server;
      if (server && typeof server.close === 'function') {
        return server.close(restart);
      } else {
        return restart();
      }
    };

    const reInstallStep = reInstall ?
      application.install(this.config.paths.root, 'npm') :
      Promise.resolve();
    return reInstallStep.then(reWatch, reWatch);
  }

  /* Determine which compiler should be used for path and
   * emit `change` event.
   *
   * path      - String. Path to file that was changed.
   * isHelper  - Boolean. Is current file included with brunch plugin?
   *
   * Returns nothing.
   */
  changeFileList(path, isHelper) {
    const compiler = this.plugins.compilers.filter(isPluginFor(path));
    const currentLinters = this.plugins.linters.filter(isPluginFor(path));
    this.fileList.emit('change', path, compiler, currentLinters, isHelper);
  }

  compile(startTime, watcherReady) {
    const config = this.config;
    const joinConfig = config._normalized.join;
    const fileList = this.fileList;
    const watcher = this.watcher;
    const optimizers = this.plugins.optimizers;
    const preCompilers = this.plugins.preCompilers;
    const callback = this.plugins.callCompileCallbacks;

    const assetErrors = fileList.getAssetErrors();
    if (assetErrors != null) {
      return assetErrors.forEach(error => logger.error(error));
    }

    /* Determine which files has been changed,
     * create new `fs_utils.GeneratedFile` instances and write them.
     */
    const writeFn = () => {
      return fsUtils.write(fileList, config, joinConfig, optimizers, startTime)
      .then(data => {
        const generatedFiles = data.changed;
        const disposed = data.disposed;
        fileList.emit('bundled');
        logger.info(genCompilationLog(
          startTime, fileList.assets, generatedFiles, disposed
        ));

          /* pass `fs_utils.GeneratedFile` instances to callbacks. */
        callback(generatedFiles);
      }, error => {
        fileList.emit('bundled');
        if (Array.isArray(error)) {
          error.forEach(subError => {
            return logger.error(subError);
          });
        } else {
          logger.error(error);
        }
      })
      .then(() => {
        if (!watcherReady) return;
        /* If it’s single non-continuous build, close file watcher and
         * exit process with correct exit code.
         */
        if (!config.persistent) {
          watcher.close();
          worker.close();
          process.on('exit', previousCode => {
            return process.exit(logger.errorHappened ? 1 : previousCode);
          });
        }
        return fileList.initial = false;
      });
    };

    Promise.all(preCompilers).then(writeFn, error => logger.error(error));
  }

  /* Set start time of last compilation to current time.
   * Returns Number.
   */
  _startCompilation() {
    if (!this.initialRun) {
      profileBrunch('startCompilation');
      this.initialRun = true;
    }
    if (!this._compilationQ && !process.env.DEBUG) {
      this._compilationQ = setTimeout(() => {
        this._compilationI = ui.animatedProgress('info', 'compiling');
      }, longCallbackTime);
    }

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

  _endBundle() {
    if (!this._compilationQ) return;
    clearTimeout(this._compilationQ);
    clearInterval(this._compilationI);
    this._compilationQ = null;
    if (this._compilationI) {
      this._compilationI();
      this._compilationI = null;
    }
  }
}

const watch = (persistent, path, options, callback) => {
  if (callback == null) callback = () => {};

  /* If path isn't provided (by CL) */
  if (path) {
    if (typeof path === 'string') {
      process.chdir(path);
    } else {
      if (typeof options === 'function') {
        callback = options;
      }
      options = path;
    }
  }
  return new BrunchWatcher(persistent, options, callback);
};

module.exports = watch;
