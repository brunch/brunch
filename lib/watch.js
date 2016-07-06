'use strict';
const sysPath = require('./path');
const getRelativePath = sysPath.relative;
const logger = require('loggy');
const chokidar = require('chokidar');
const debug = require('debug')('brunch:watch');
const speed = require('since-app-start');
const serveBrunch = require('serve-brunch');
const checkDeps = require('check-dependencies');
const cpus = require('os').cpus().length;
const deppack = require('deppack');

const workers = require('./workers'); // close, init
const fsUtils = require('./fs_utils');
const application = require('./config'); // loadConfig, install
const plugins = require('./plugins'); // init, isPluginFor
const helpers = require('./helpers'); // asyncFilter, flatten, generateCompilationLog, getCompilationProgress
const checkHmrAutoReload = require('./hmr').checkAutoReload;

const emptyFileListInterval = 1000;

const filterNonExistentPaths = paths => {
  return Promise.all(paths.map(helpers.fsExists)).then(values => {
    const watchedFiles = paths.filter((path, index) => values[index]);
    return watchedFiles;
  });
};

// Filter paths that exist and watch them with `chokidar` package.
const getWatchedPaths = config => {
  const configs = config._normalized.paths.allConfigFiles;
  const pkg = config._normalized.packageInfo;
  const getFiles = pkgs => helpers.flatten(pkgs.components.map(c => c.files));
  const watched = config.paths.watched.concat(configs, getFiles(pkg.npm), getFiles(pkg.bower));
  return filterNonExistentPaths(watched);
};

const checkProjectDependencies = config => {
  const packageDir = config.paths.root;
  const isProduction = config._normalized.isProduction;
  const scopeList = isProduction ? ['dependencies'] : ['dependencies', 'devDependencies'];
  return checkDeps({packageDir, scopeList}).then(out => {
    if (out.depsWereOk) return;
    const pkgs = out.error.filter(x => x.includes(':')).map(x => x.split(':', 1)[0]);
    throw pkgs;
  }).catch(pkgs => {
    // filter out symlinked packages
    const pkgPath = pkg => sysPath.join(packageDir, 'node_modules', pkg);
    const isNotSymlink = pkg => helpers.isSymlink(pkgPath(pkg)).then(x => !x);
    return helpers.asyncFilter(pkgs, isNotSymlink).then(unmetPkgs => {
      if (!unmetPkgs.length) return;
      logger.info(`Using outdated versions of ${unmetPkgs.join(', ')}, trying to update to match package.json versions`);
      return application.install(packageDir, 'npm', isProduction);
    });
  });
};

const MAX_JOBS = 32;
const setDefaultJobsCount = options => {
  const envy = process.env.BRUNCH_JOBS;
  if (!options.jobs && !envy) return;
  if (options.jobs === true) options.jobs = undefined;
  // Mitigates Intel Hyperthreading.
  const str = options.jobs || envy || cpus / 2;
  const parsed = parseInt(str);
  const jobs = isNaN(parsed) || parsed < 1 || parsed > MAX_JOBS ? 1 : parsed;
  options.jobs = jobs;
  return jobs;
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
  constructor(persistent, options, onCompile) {
    speed.profile('Created BrunchWatcher');
    this._constructorOptions = [persistent, options, onCompile];
    this._startTime = Date.now() - speed.sinceStart();
    this._isFirstRun = true;
    this._onReload = options._onReload;
    setDefaultJobsCount(options);

    application.loadConfig(persistent, options)
      .then(cfg => {
        this.config = cfg;
        return checkProjectDependencies(cfg)
          .then(() => cfg, () => cfg);
      })
      .then(cfg => {
        if (options.jobs > 1) {
          workers.init(persistent, options, cfg);
        }
        this.fileList = new fsUtils.FileList(cfg, this);
        return Promise.all([
          getWatchedPaths(cfg),
          serveBrunch.serve(cfg.server),
          plugins.init(cfg, onCompile)
        ]);
      })
      .then(res => {
        this._watchedPaths = res[0];
        this.server = res[1];
        const plugins = this.plugins = res[2];
        const cfg = this.config;
        deppack.setPlugins(plugins, cfg.npm.compilers);
        if (cfg.hot) {
          checkHmrAutoReload(cfg, plugins);
        }
        this.initCompilation();
      })
      .catch(error => {
        let text = typeof error === 'string' ? error : '';
        text = error.code === 'BRSYNTAX' ? text : `Initialization error - ${text.trim()}`;
        if (typeof error === 'string') {
          logger.error(text);
        } else {
          logger.error(text, error);
        }
        process.exit(1);
      });
  }

  initCompilation() {
    const cfg = this.config;

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
      const relPath = getRelativePath(rootPath, path);
      cfg.npm.static.push(relPath);
      this.changeFileList(relPath, true);
    });
    Object.freeze(cfg.npm.static);

    const nothingToCompile = "Nothing to compile. Most likely you don't have any source files yet, in which case, go ahead and create some! Otherwise, you probably don't have any plugin handling your source files (for plain javascript, that would be \"javascript-brunch\")";
    const checkNothingToCompile = () => {
      if (this.fileList.files.size === 0 && this.fileList.staticFiles.size === 0) {
        logger.warn(nothingToCompile);
      }
    };

    if (cfg.persistent) {
      if (this.nothingToCompileTimer) {
        clearTimeout(this.nothingToCompileTimer);
      }
      this.nothingToCompileTimer = setTimeout(checkNothingToCompile, emptyFileListInterval);
    } else {
      process.on('exit', code => {
        checkNothingToCompile();
        process.exit(code);
      });
    }

    if (cfg.persistent && cfg.stdin) {
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

    speed.profile('Loaded watcher');
    return chokidar.watch(watchedPaths, {
      ignored: fsUtils.isIgnored, persistent, usePolling, awaitWriteFinish
    })
      .on('error', logger.error)
      .on('add', absPath => {
        absPath = sysPath.slashes(absPath);
        if (isDebug) debug(`add ${absPath}`);
        const path = getRelativePath(rootPath, absPath);
        if (isConfig(path)) return; // Pass for the initial files.
        this.startCompilation(path);
        this.fileList.emit('add', path);
      })
      .on('change', absPath => {
        absPath = sysPath.slashes(absPath);
        if (isDebug) debug(`change ${absPath}`);
        const path = getRelativePath(rootPath, absPath);
        if (possibleConfigFiles[path]) {
          this.restartBrunch();
        } else if (path === packageConfig) {
          this.restartBrunch('npm');
        } else if (path === bowerConfig) {
          this.restartBrunch('bower');
        } else {
          this.startCompilation(path);
        }
      })
      .on('unlink', absPath => {
        absPath = sysPath.slashes(absPath);
        if (isDebug) debug(`unlink ${absPath}`);
        const path = getRelativePath(rootPath, absPath);
        if (isConfig(path)) return this.exitProcessFromFile(path);
        this.startCompilation(path, true);
      })
      .once('ready', () => {
        speed.profile('Watcher is ready');
        this.watcherIsReady = true;
      });
  }

  restartBrunch(reinstallType) {
    const restart = () => {
      // we need this to keep compatibility with global `brunch` binaries
      // from older versions which didn't create a child process
      if (process.send && process.env.BRUNCH_FORKED_PROCESS === 'true') {
        process.send('reload');
      } else {
        const opts = this._constructorOptions;
        const newWatcher = new BrunchWatcher(opts[0], opts[1], opts[2]);
        if (this._onReload) this._onReload(newWatcher);
        return newWatcher;
      }
    };

    const reWatch = () => {
      logger.info('Reloading watcher...');
      this.plugins.teardownBrunch();
      const server = this.server;
      if (server && typeof server.close === 'function') {
        return server.close(restart);
      }
      return restart();
    };

    clearTimeout(this.nothingToCompileTimer);
    this.fileList.dispose();
    this.watcher.close();
    workers.close();

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
    path = sysPath.slashes(path);
    if (this.fileList.is('assets', path)) {
      const compiler = this.plugins.staticCompilers.filter(plugins.isPluginFor(path, true));
      this.fileList.emit('change', path, compiler, [], isHelper);
    } else {
      const compiler = this.plugins.compilers.filter(plugins.isPluginFor(path));
      const currentLinters = this.plugins.linters.filter(plugins.isPluginFor(path));
      this.fileList.emit('change', path, compiler, currentLinters, isHelper);
    }
  }

  compile(startTime, watcherReady) {
    const config = this.config;
    const joinConfig = config._normalized.join;
    const fileList = this.fileList;
    const watcher = this.watcher;
    const optimizers = this.plugins.optimizers;
    const preCompilers = this.plugins.preCompilers();
    const callback = this.plugins.callCompileCallbacks;

    const assetErrors = fileList.getAssetErrors();
    if (Array.isArray(assetErrors)) {
      return assetErrors.forEach(error => logger.error(error));
    }

    // Determine which files has been changed,
    // create new `fs_utils.GeneratedFile` instances and write them.
    Promise.all(preCompilers).then(() => {
      return fsUtils.write(fileList, config, joinConfig, optimizers, startTime);
    }).then(data => {
      const generatedFiles = data.changed;
      const disposed = data.disposed;
      fileList.removeDisposedFiles();
      fileList.emit('bundled');
      logger.info(helpers.generateCompilationLog(
        startTime, fileList.assets, generatedFiles, disposed
      ));

      // Pass `fs_utils.GeneratedFile` instances to callbacks.
      // Does not block the execution.
      const assets = fileList.assets.filter(a => a.copyTime > startTime);
      callback(generatedFiles, assets);
    }, error => {
      fileList.emit('bundled');
      if (!Array.isArray(error)) error = [error];
      const canTryRecover = error.find(err => err.toString().includes('run `npm install`'));

      error.forEach(subError => logger.error(subError));

      if (canTryRecover) {
        logger.warn('Attempting to recover from failed NPM requires by running `npm install`...');
        this.restartBrunch('npm');
      }
    })
    .then(() => {
      if (!watcherReady) return;
      // If it’s single non-continuous build, close file watcher and
      // exit process with correct exit code.
      if (!config.persistent) {
        watcher.close();
        workers.close();
        process.on('exit', previousCode => {
          const currentCode = logger.errorHappened ? 1 : previousCode;
          return process.exit(currentCode);
        });
      }
      fileList.initial = false;
    }).catch(logger.error);
  }

  _createProgress() {
    if (this._compilationProgress || process.env.DEBUG) return false;
    const passedTime = this._isFirstRun && speed.sinceStart();
    this._compilationProgress = helpers.getCompilationProgress(
      passedTime, logger.info
    );
  }

  // Set start time of last compilation to current time.
  // Returns Number.
  startCompilation(path, wasRemoved) {
    if (wasRemoved) {
      this.fileList.emit('unlink', path);
    } else {
      this.changeFileList(path, false);
    }
    this._createProgress();
    if (this._isFirstRun) {
      speed.profile('Starting compilation');
      this._isFirstRun = false;
    }
    if (!this._startTime) this._startTime = Date.now();
    return this._startTime;
  }

  // Get last compilation start time and reset the state.
  // Returns Number.
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

const watch = (persistent, path, options, callback) => {
  if (!callback) callback = () => {};

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
