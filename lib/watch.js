'use strict';
const getRelativePath = require('path').relative;
const fsaccess = require('fs').access;
const logger = require('loggy');
const chokidar = require('chokidar');
const dbg = require('debug');
const debug = dbg('brunch:watch');
const debugSpeed = dbg('brunch:speed');

/* Worker must be loaded before fs_utils. */
const worker = require('./worker');
const fsUtils = require('./fs_utils');
const application = require('./application');
const ui = require('./ui');
const plugins = require('./plugins');
const server = require('./server');
const helpers = require('./helpers');

const longCallbackTime = 4000; // ms.

const fsExists = (path) => {
  return new Promise(resolve => {
    fsaccess(path, (error) => {
      if (error) resolve(false);
      else resolve(true);
    });
  });
};

const profileBrunch = (typeof global.profileBrunch === 'function') ?
  (item => debugSpeed(global.profileBrunch(item)))
  : Function.prototype;

/* Filter paths that exist and watch them with `chokidar` package.
 *
 * config   - application config
 *
 * Returns nothing.
 */

const getWatchedPaths = (config) => {
  const configs = config._normalized.paths.allConfigFiles;
  const pkg = config._normalized.packageInfo;
  const getFiles = pkgs => helpers.flatten(pkgs.components.map(c => c.files));
  const watched = config.paths.watched.concat(
    configs, getFiles(pkg.npm),
    getFiles(pkg.bower), getFiles(pkg.component)
  );

  return Promise.all(watched.map(fsExists)).then(values => {
    const watchedFiles = watched.filter((path, index) => values[index]);
    return watchedFiles;
  });
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

const setProp = (obj, name) => result => (obj[name] = result);

class BrunchWatcher {
  constructor(persistent, options, onCompile) {
    profileBrunch('Created BrunchWatcher');
    this._constructorOptions = [persistent, options, onCompile];
    this._startTime = Date.now();

    application.loadConfig(persistent, options).then(setProp(this, 'config'))
      .then(cfg => {
        this.fileList = new fsUtils.FileList(cfg);
        return Promise.all([
          getWatchedPaths(cfg).then(setProp(this, '_watchedPaths')),
          server.init(cfg).then(setProp(this, 'server')),
          plugins.init(cfg, onCompile).then(setProp(this, 'plugins'))
        ]);
      })
      .then(() => this.initCompilation())
      .catch(error => {
        const text = typeof error === 'string' ?
          error :
          error.stack.replace(/^Error:\s/, '');
        logger.error('Initialization error -', text);
      });
  }

  initCompilation() {
    const cfg = this.config;
    const wrk = this.config.workers && this.config.workers || {};
    if (wrk.enabled && !worker({
      changeFileList: this.changeFileList,
      compilers: this.plugins.compilers,
      linters: this.plugins.linters,
      fileList: this.fileList,
      config: cfg
    })) {
      return;
    }
    this.watcher = this.initWatcher(this._watchedPaths);
    this.fileList
      .on('ready', () => {
        if (!this._startTime) return;
        this.compile(this._endCompilation(), this.watcherIsReady);
      })
      .on('bundled', this._endBundle.bind(this));

    // Emit `change` event for each file that is included with plugins.
    // Wish it worked like `watcher.add includes`.
    const rootPath = cfg.paths.root;
    this.plugins.includes.forEach(path => {
      this.changeFileList(getRelativePath(rootPath, path), true);
    });

    if (cfg.persistent && cfg.stdin) {
      process.stdin.on('end', () => process.exit(0));
      process.stdin.resume();
    }
  }

  exitProcessFromFile(reasonFile) {
    logger.info(`Detected removal of ${reasonFile}\nExiting.`);
    process.exit(0);
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
  initWatcher(watchedPaths) {
    const isDebug = !!process.env.DEBUG;
    const config = this.config._normalized;
    const persistent = config.persistent;
    const usePolling = config.usePolling;
    const awaitWriteFinish = config.awaitWriteFinish &&
      {stabilityThreshold: 50, pollInterval: 10};
    const possibleConfigFiles = config.paths.possibleConfigFiles;
    const rootPath = config.paths.root;
    const packageConfig = config.paths.packageConfig;
    const bowerConfig = config.paths.bowerConfig;
    const isConfig = path => possibleConfigFiles[path] ||
      path === packageConfig || path === bowerConfig;

    profileBrunch('Loaded watcher');
    return chokidar.watch(watchedPaths, {
      ignored: fsUtils.ignored, persistent: persistent, usePolling: usePolling,
      awaitWriteFinish: awaitWriteFinish
    })
      .on('error', logger.error)
      .on('add', absPath => {
        if (isDebug) debug(`add ${absPath}`);
        const path = getRelativePath(rootPath, absPath);
        if (isConfig(path)) return; // Pass for the initial files.
        this.startCompilation(path);
      })
      .on('change', absPath => {
        if (isDebug) debug(`change ${absPath}`);
        const path = getRelativePath(rootPath, absPath);
        if (possibleConfigFiles[path] || path === packageConfig) {
          this.restartBrunch('npm');
        } else if (path === bowerConfig) {
          this.restartBrunch('bower');
        } else {
          this.startCompilation(path);
        }
      })
      .on('unlink', absPath => {
        if (isDebug) debug(`unlink ${absPath}`);
        const path = getRelativePath(rootPath, absPath);
        if (isConfig(path)) return this.exitProcessFromFile(path);
        this.startCompilation(path, true);
      })
      .once('ready', () => {
        profileBrunch('Watcher is ready');
        this.watcherIsReady = true;
      });
  }

  restartBrunch(reinstallType) {
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

    const reInstallStep = reinstallType ?
      application.install(this.config.paths.root, reinstallType) :
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
    const compiler = this.plugins.compilers.filter(plugins.isPluginFor(path));
    const currentLinters = this.plugins.linters.filter(plugins.isPluginFor(path));
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

    Promise.all(preCompilers).then(() => {
      return fsUtils.write(fileList, config, joinConfig, optimizers, startTime);
    }).then(data => {
      const generatedFiles = data.changed;
      const disposed = data.disposed;
      fileList.emit('bundled');
      logger.info(helpers.generateCompilationLog(
        startTime, fileList.assets, generatedFiles, disposed
      ));

      // Pass `fs_utils.GeneratedFile` instances to callbacks.
      // Does not block the execution.
      callback(generatedFiles);
    }, error => {
      fileList.emit('bundled');
      if (Array.isArray(error)) {
        error.forEach(subError => logger.error(subError));
      } else {
        logger.error(error);
      }
    })
    .then(() => {
      if (!watcherReady) return;
      // If it’s single non-continuous build, close file watcher and
      // exit process with correct exit code.
      if (!config.persistent) {
        watcher.close();
        worker.close();
        process.on('exit', previousCode => {
          const currentCode = logger.errorHappened ? 1 : previousCode;
          return process.exit(currentCode);
        });
      }
      fileList.initial = false;
    }).catch(logger.error);
  }

  /* Set start time of last compilation to current time.
   * Returns Number.
   */
  startCompilation(path, wasRemoved) {
    if (wasRemoved) {
      this.fileList.emit('unlink', path);
    } else {
      this.changeFileList(path, false);
    }
    if (!this.initialRun) {
      profileBrunch('Starting compilation');
      this.initialRun = true;
    }
    if (!this._compilationQ && !process.env.DEBUG) {
      this._compilationQ = setTimeout(() => {
        this._compilationI = ui.animatedProgress('info', 'compiling');
      }, longCallbackTime);
    }

    const start = this._startTime || (this._startTime = Date.now());
    return start;
  }

  /* Get last compilation start time and reset the state.
   * Returns Number.
   */
  _endCompilation() {
    const start = this._startTime;
    this._startTime = null;
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
  if (callback == null) callback = Function.prototype;

  // If path isn't provided (by CLI).
  if (path) {
    if (typeof path === 'string') {
      process.chdir(path);
    } else {
      if (typeof options === 'function') callback = options;
      options = path;
    }
  }
  return new BrunchWatcher(persistent, options, callback);
};

module.exports = watch;
