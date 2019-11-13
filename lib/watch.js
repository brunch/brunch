'use strict';
const sysPath = require('universal-path');
const getRelativePath = sysPath.relative;
const logger = require('loggy');
const chokidar = require('chokidar');
const debug = require('debug')('brunch:watch');
const speed = require('since-app-start');
const {serve} = require('./serve');
const cpus = require('os').cpus().length;
const deppack = require('deppack');
const {installDeps} = require('deps-install');

const write = require('./fs_utils/write');
const ignored = require('./fs_utils/is_ignored');
const FileList = require('./fs_utils/file_list');
const pipeline = require('./fs_utils/pipeline');

const application = require('./utils/config'); // loadConfig, install
const plugins = require('./utils/plugins');
const helpers = require('./utils/helpers'); // asyncFilter, flatten, generateCompilationLog, getCompilationProgress

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

    mergedHooks[name] = function(...args) {
      return allHooks.map(plugin => {
        return plugin[name](...args);
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
  const watched = config.paths.watched.concat(configs, getFiles(pkg.npm));
  return filterNonExistentPaths(watched);
};

const setDefaultJobsCount = jobs => {
  const MAX_JOBS = 32;
  const env = process.env.BRUNCH_JOBS;
  if (!jobs && !env || jobs === true) return;
  // Mitigates Intel Hyperthreading.
  const str = jobs || env || cpus / 2;
  const int = Math.round(str);
  return isNaN(int) ||
    int < 1 ||
    int > MAX_JOBS ? 1 : int;
};

/* persistent - Boolean: should brunch build the app only once or watch it?
 * options    - Object: {configPath, optimize, server, port}.
 *              Only configPath is required.
 * onCompile  - Function that will be executed after every successful
 *              compilation. May receive an array of `fs_utils.GeneratedFile`.
 *
 * this.config is an application config.
 * this._startTime is a mutable timestamp that represents latest compilation
 * start time. It is `null` when there are no compilations.
 */
class BrunchWatcher {
  constructor(options = {}) {
    speed.profile('Created BrunchWatcher');
    if (!options.persistent) options.persistent = false;
    if (options.path) {
      process.chdir(options.path);
    }
    // TODO: this breaks new Brunchwatcher(this._options)
    this._options = options;
    this._startTime = Date.now() - speed.sinceStart;
    this._isFirstRun = true;
    this._onReload = options._onReload;
    options.jobs = setDefaultJobsCount(options.jobs);
  }

  async init() {
    const options = this._options;
    if (!options.persistent) {
      process.on('exit', previousCode => {
        const currentCode = logger.errorHappened ? 1 : previousCode;
        process.exit(currentCode);
      });
    }
    try {
      const cfg = await application.loadConfig(options);
      this.config = cfg;
      const promises = [getWatchedPaths(cfg._normalized), plugins(cfg, options.dependencies)];
      if (cfg.server.run) promises.push(serve(cfg.server));
      const res = await Promise.all(promises);

      const [watchedPaths, pluginArgs, server] = res;
      const {hooks} = pluginArgs;
      this.server = server;
      if (options.onCompile) hooks.onCompile.push({onCompile: options.onCompile});
      this.hooks = mergeHooks(hooks, cfg.hooks);
      this.plugins = pluginArgs.plugins;

      pipeline.setPlugins(pluginArgs.plugins.all);
      pipeline.setNpmCompilers(cfg.npm.compilers);
      deppack.setPlugins(pluginArgs.plugins, cfg.npm.compilers);
      await Promise.all(this.hooks.preCompile());
      this.initWatcher(watchedPaths);
      this.initCompilation();
    } catch (error) {
      if (typeof error === 'string') {
        // TODO: Title - init error.
        logger.error(error);
      } else {
        const text = error.code === 'CFG_LOAD_FAILED' ?
          error.message :
          `Initialization error - ${error.message.trim()}`;
        // TODO: Title - init error.
        logger.error(text, error);
      }
      process.exit(1);
    }
    return this;
  }

  async initCompilation() {
    const cfg = this.config;

    this.fileList = new FileList(cfg);

    this.fileList.on('ready', () => {
      if (this._startTime) {
        this.compile();
      }
    });

    const rootPath = cfg.paths.root;
    this.plugins.includes.forEach(path => {
      const relPath = getRelativePath(rootPath, path);

      // Emit `change` event for each file that is included with plugins.
      this.startCompilation('change', relPath);
      cfg.npm.static.push(relPath);
    });

    if (!cfg.persistent) return;

    const emptyFileListInterval = 1000;
    const checkNothingToCompile = () => {
      if (!this.fileList.hasFiles) {
        logger.warn(`Nothing to compile. Most likely you don't have any source files yet, in which case, go ahead and create some!`);
      }
    };

    clearTimeout(this.nothingToCompileTimer);
    this.nothingToCompileTimer = setTimeout(checkNothingToCompile, emptyFileListInterval);

    if (cfg.stdin) {
      process.stdin.on('end', () => process.exit(0));
      process.stdin.resume();
    }
  }

  exitProcessFromFile(reasonFile) {
    logger.info(`Detected removal of ${reasonFile}\nExiting.`);
    process.exit(0);
  }

  initWatcher(watchedPaths) {
    const isDebug = !!process.env.DEBUG;
    const config = this.config._normalized;
    const paths = config.paths;
    const isConfig = path => paths.allConfigFiles.includes(path);

    speed.profile('Loaded watcher');
    this.watcher = chokidar.watch(watchedPaths, Object.assign({
      ignored,
      persistent: config.persistent,
    }, config.watcher))
      .on('error', error => {
        // TODO: Watch error.
        logger.error(error);
      })
      .on('add', absPath => {
        if (isDebug) debug(`add ${absPath}`);

        const path = getRelativePath(paths.root, absPath);
        if (isConfig(path)) return; // Pass for the initial files.
        this.startCompilation('change', path);
      })
      .on('change', absPath => {
        if (isDebug) debug(`change ${absPath}`);

        const path = getRelativePath(paths.root, absPath);
        if (path === paths.packageConfig) {
          this.restartBrunch();
        } else if (isConfig(path)) {
          this.restartBrunch(false);
        } else {
          this.startCompilation('change', path);
        }
      })
      .on('unlink', absPath => {
        if (isDebug) debug(`unlink ${absPath}`);

        const path = getRelativePath(paths.root, absPath);
        if (isConfig(path)) return this.exitProcessFromFile(path);
        this.startCompilation('unlink', path);
      })
      .once('ready', () => {
        speed.profile('Watcher is ready');
        this.watcherIsReady = true;
      });
  }

  restartBrunch(installPackages = true) {
    const restart = () => {
      // we need this to keep compatibility with global `brunch` binaries
      // from older versions which didn't create a child process
      if (process.send && process.env.BRUNCH_FORKED_PROCESS === 'true') {
        process.send('reload');
      } else {
        const newWatcher = new BrunchWatcher(this._options);
        newWatcher.init();
        if (this._onReload) this._onReload(newWatcher);
        return newWatcher;
      }
    };

    const reWatch = () => {
      logger.info('Reloading watcher...');
      this.hooks.teardown();
      return restart();
    };

    return this.close()
      .then(() => installPackages ? installDeps(this.config.paths.root, {logger}) : Promise.resolve())
      .then(reWatch, reWatch);
  }

  close() {
    if (this.closed) return Promise.resolve();
    this.closed = true;
    clearTimeout(this.nothingToCompileTimer);
    this.fileList.dispose();

    const promises = [this.watcher.close()];
    if (this.server) promises.push(this.server.close());
    return Promise.all(promises);
  }

  compile() {
    const startTime = this._endCompilation();
    const config = this.config;
    const joinConfig = config._normalized.join;
    const fileList = this.fileList;
    const optimizers = this.plugins.optimizers;

    const assetErrors = fileList.assetErrors;
    if (assetErrors.length) {
      assetErrors.forEach(error => {
        // TODO: Title - asset processing error
        logger.error(error);
      });
      return;
    }

    // Determine which files has been changed,
    // create new `fs_utils.GeneratedFile` instances and write them.
    write(fileList, config, joinConfig, optimizers, startTime).then(data => {
      const generatedFiles = data.changed;
      const disposed = data.disposed;
      fileList.cleanDisposedFiles();
      this._endBundle();
      const assets = fileList.getAssetsCopiedAfter(startTime);
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

      // Compilation, optimization, linting errors are logged here.
      error.forEach(subError => {
        // TODO: Title - pipeline error.
        logger.error(subError);
      });

      const canTryRecover = error.find(err => err.code === 'DEPS_RESOLVE_INSTALL');
      if (canTryRecover) {
        logger.warn('Attempting to recover from failed NPM requires by running `npm install`...');
        this.restartBrunch();
      }
    }).then(() => {
      if (!this.watcherIsReady) return;
      // If it’s single non-continuous build, close file watcher and
      // exit process with correct exit code.
      fileList.initial = false;
      if (!config.persistent) {
        return this.close();
      }
    }).catch(logger.error);
  }

  _createProgress() {
    if (this._compilationProgress || process.env.DEBUG) return false;
    const passedTime = this._isFirstRun && speed.sinceStart;
    this._compilationProgress = helpers.getCompilationProgress(
      passedTime, logger.info
    );
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

exports.BrunchWatcher = BrunchWatcher;
