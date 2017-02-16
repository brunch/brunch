'use strict';
const sysPath = require('universal-path');
const logger = require('loggy');
const chokidar = require('chokidar');
const debug = require('debug')('brunch:watch');
const speed = require('since-app-start');
const serveBrunch = require('serve-brunch');
const deppack = require('deppack');
const install = require('deps-install');

const write = require('./fs_utils/write');
const ignored = require('./fs_utils/is_ignored');
const FileList = require('./fs_utils/file_list');
const pipeline = require('./fs_utils/pipeline');

const loadConfig = require('./utils/config');
const plugins = require('./utils/plugins');
const helpers = require('./utils/helpers');

const promisifyHook = plugin => {
  const hook = plugin.preCompile;
  if (!hook.length) return;
  plugin.preCompile = () => new Promise(resolve => {
    hook.call(plugin, resolve);
  });
};

const mergeHooks = (plugins, config) => {
  return Object.keys(plugins).reduce((mergedHooks, name) => {
    const allHooks = plugins[name].concat(config);
    if (name === 'preCompile') {
      allHooks.forEach(promisifyHook);
    }

    mergedHooks[name] = function() {
      // => has lexical `arguments`
      return allHooks.map(plugin => {
        return plugin[name].apply(plugin, arguments);
      });
    };

    return mergedHooks;
  }, {});
};

const filterNonExistentPaths = paths => {
  return Promise.all(paths.map(helpers.fsExists)).then(values => {
    // watched files
    return paths.filter((path, index) => values[index]);
  });
};

// Filter paths that exist and watch them with `chokidar` package.
const getWatchedPaths = config => {
  const configs = config.paths.allConfigFiles;
  const pkg = config.packageInfo;
  const getFiles = pkgs => helpers.flatten(pkgs.components.map(c => c.files));
  const watched = config.paths.watched.concat(configs, getFiles(pkg.npm), getFiles(pkg.bower));
  return filterNonExistentPaths(watched);
};

/*
 * this.config is an application config.
 * this._startTime is a mutable timestamp that represents latest compilation
 * start time. It is `null` when there are no compilations.
 */
class BrunchWatcher {
  constructor(options, partialConfig) {
    speed.profile('Created BrunchWatcher');
    this._options = options;
    this._partialConfig = partialConfig;

    this._persist = options.persist;
    this._startTime = Date.now() - speed.sinceStart;
    this._isFirstRun = true;

    if (!this._persist) {
      process.on('exit', prevCode => {
        const currentCode = logger.errorHappened ? 1 : prevCode;
        process.exit(currentCode);
      });
    }

    if (options.stdin) {
      process.stdin.on('end', () => process.exit(0));
      process.stdin.resume();
    }

    const envs = options.envs;
    loadConfig(envs, partialConfig)
      .then(cfg => {
        this.config = cfg;
        return Promise.all([
          getWatchedPaths(cfg._normalized),
          serveBrunch.serve(cfg.server),
          plugins(envs, cfg),
        ]);
      })
      .then(res => {
        const cfg = this.config;
        const watchedPaths = res[0];
        this.server = res[1];
        const hooks = res[2].hooks;
        hooks.onCompile.push({onCompile: options.onCompile});
        this.hooks = mergeHooks(hooks, cfg.hooks);
        const plugins = this.plugins = res[2].plugins;

        pipeline.setPlugins(plugins.all);
        pipeline.setNpmCompilers(cfg.npm.compilers);
        deppack.setPlugins(plugins, cfg.npm.compilers);

        return Promise.all(this.hooks.preCompile()).then(() => {
          this.initWatcher(watchedPaths);
          this.initCompilation();
        });
      })
      .catch(error => {
        if (typeof error === 'string') {
          logger.error(error);
        } else {
          const text = error.code === 'CFG_LOAD_FAILED' ?
            error.message :
            `Initialization error - ${error.message.trim()}`;
          logger.error(text, error);
        }
        process.exit(1);
      });
  }

  initCompilation() {
    const cfg = this.config;

    this.fileList = new FileList(cfg);
    this.fileList.on('ready', () => {
      if (this._startTime) {
        this.compile();
      }
    });

    const rootPath = cfg.paths.root;
    this.plugins.includes.forEach(path => {
      const relPath = sysPath.relative(rootPath, path);

      // Emit `change` event for each file that is included with plugins.
      this.startCompilation('change', relPath);
      cfg.npm.static.push(relPath);
    });

    Object.freeze(cfg.npm.static);

    if (!this._persist) return;

    const emptyFileListInterval = 1000;
    const checkNothingToCompile = () => {
      if (!this.fileList.hasFiles) {
        logger.warn(`Nothing to compile. Most likely you don't have any source files yet, in which case, go ahead and create some!`);
      }
    };

    clearTimeout(this.nothingToCompileTimer);
    this.nothingToCompileTimer = setTimeout(checkNothingToCompile, emptyFileListInterval);
  }

  exitProcessFromFile(reasonFile) {
    logger.info(`Detected removal of ${reasonFile}\nExiting.`);
    process.exit(0);
  }

  initWatcher(watchedPaths) {
    const config = this.config._normalized;
    const paths = config.paths;
    const isConfig = path => paths.allConfigFiles.includes(path);

    speed.profile('Loaded watcher');
    this.watcher = chokidar.watch(watchedPaths, Object.assign({
      ignored,
    }, config.watcher))
      .on('error', logger.error)
      .on('add', absPath => {
        const path = sysPath.relative(paths.root, absPath);
        debug(`add ${path}`);
        if (isConfig(path)) return; // Pass for the initial files.
        this.startCompilation('change', path);
      })
      .on('change', absPath => {
        const path = sysPath.relative(paths.root, absPath);
        debug(`change ${path}`);
        if (path === paths.packageConfig) {
          this.restartBrunch('package');
        } else if (path === paths.bowerConfig) {
          this.restartBrunch('bower');
        } else if (isConfig(path)) {
          this.restartBrunch();
        } else {
          this.startCompilation('change', path);
        }
      })
      .on('unlink', absPath => {
        const path = sysPath.relative(paths.root, absPath);
        debug(`unlink ${path}`);
        if (isConfig(path)) return this.exitProcessFromFile(path);
        this.startCompilation('unlink', path);
      })
      .once('ready', () => {
        speed.profile('Watcher is ready');
        this.watcherIsReady = true;
      });
  }

  restartBrunch(pkgType) {
    const restart = () => {
      const newWatcher = new BrunchWatcher(this._options, this._partialConfig);
      this._options._onReload(newWatcher);
      return newWatcher;
    };

    const rootPath = this.config.paths.root;
    const reWatch = () => {
      logger.info('Reloading watcher...');
      this.hooks.teardown();
      const server = this.server;
      if (server && typeof server.close === 'function') {
        return server.close(restart);
      }
      return restart();
    };

    clearTimeout(this.nothingToCompileTimer);
    this.fileList.dispose();
    this.watcher.close();

    return install({rootPath, pkgType}).then(reWatch, reWatch);
  }

  compile() {
    const startTime = this._endCompilation();
    const config = this.config;
    const joinConfig = config._normalized.join;
    const fileList = this.fileList;
    const optimizers = this.plugins.optimizers;

    const assetErrors = fileList.assetErrors;
    if (assetErrors.length) {
      assetErrors.forEach(error => logger.error(error));
      return;
    }

    // Determine which files has been changed,
    // create new `fs_utils.GeneratedFile` instances and write them.
    write(fileList, config, joinConfig, optimizers, startTime).then(data => {
      const generatedFiles = data.changed;
      const disposed = data.disposed;
      fileList.removeDisposedFiles();
      this._endBundle();
      const assets = fileList.copiedAfter(startTime);
      logger.info(helpers.generateCompilationLog(
        startTime, assets, generatedFiles, disposed
      ));

      // Pass `fs_utils.GeneratedFile` instances to callbacks.
      // Does not block the execution.
      this.hooks.onCompile(generatedFiles, assets);
    }, error => {
      this._endBundle();
      if (error.code === 'WRITE_FAILED') return; // Ignore write errors as they are logged already

      if (!Array.isArray(error)) error = [error];
      error.forEach(subError => logger.error(subError));

      const canTryRecover = error.find(err => err.code === 'DEPS_RESOLVE_INSTALL');
      if (canTryRecover) {
        logger.warn('Attempting to recover from failed NPM requires by running `npm install`...');
        this.restartBrunch('package');
      }
    }).then(() => {
      if (!this.watcherIsReady) return;
      // If it’s single non-continuous build, close file watcher and
      // exit process with correct exit code.
      if (!this._persist) {
        this.watcher.close();
      }
      fileList.initial = false;
    }).catch(logger.error);
  }

  _createProgress() {
    if (this._compilationProgress || process.env.DEBUG) return false;
    const passedTime = this._isFirstRun && speed.sinceStart;
    this._compilationProgress = helpers.getCompilationProgress(passedTime);
  }

  // Set start time of last compilation to current time.
  // Returns number.
  startCompilation(type, path) {
    this.fileList.emit(type, path);
    this._createProgress();
    if (this._isFirstRun) {
      speed.profile('Starting compilation');
      this._isFirstRun = false;
    }
    if (!this._startTime) this._startTime = Date.now();
    return this._startTime;
  }

  // Get last compilation start time and reset the state.
  // Returns number.
  _endCompilation() {
    const start = this._startTime;
    this._startTime = null;
    return start;
  }

  _endBundle() {
    if (!this._compilationProgress) return;
    this._compilationProgress();
    this._compilationProgress = null;
  }
}

module.exports = BrunchWatcher;
