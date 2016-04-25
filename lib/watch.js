'use strict';
const sysPath = require('path');
const getRelativePath = sysPath.relative;
const logger = require('loggy');
const chokidar = require('chokidar');
const debug = require('debug')('brunch:watch');
const speed = require('since-app-start');
const serveBrunch = require('serve-brunch');
const checkDeps = require('check-dependencies');
const promisify = require('micro-promisify');
const fslstat = promisify(require('fs').lstat);
const fsaccess = promisify(require('fs').access);
const cpus = require('os').cpus();

const workers = require('./workers'); // close, init
const fsUtils = require('./fs_utils');
const application = require('./config'); // loadConfig, install
const plugins = require('./plugins'); // init, isPluginFor
const helpers = require('./helpers'); // asyncFilter, flatten, generateCompilationLog, getCompilationProgress
const checkHmrAutoReload = require('./hmr').checkAutoReload;

const fsExists = (path) => {
  return fsaccess(path).then(() => true, () => false);
};

const filterNonExistentPaths = (paths) => {
  return Promise.all(paths.map(fsExists)).then(values => {
    const watchedFiles = paths.filter((path, index) => values[index]);
    return watchedFiles;
  });
};

const isSymlink = (path) => {
  return fslstat(path).then((stat => stat.isSymbolicLink()), () => false);
};

// Filter paths that exist and watch them with `chokidar` package.
const getWatchedPaths = (config) => {
  const configs = config._normalized.paths.allConfigFiles;
  const pkg = config._normalized.packageInfo;
  const getFiles = pkgs => helpers.flatten(pkgs.components.map(c => c.files));
  const watched = config.paths.watched.concat(configs, getFiles(pkg.npm), getFiles(pkg.bower));
  return filterNonExistentPaths(watched);
};

const setProp = (obj, name) => result => (obj[name] = result);

const checkProjectDependencies = cfg => {
  const rootPath = cfg.paths.root;
  const isProduction = cfg._normalized.isProduction;
  const pkgPath = pkg => sysPath.join(rootPath, 'node_modules', pkg);
  const scopeList = isProduction ? ['dependencies'] : ['dependencies', 'devDependencies'];
  return checkDeps({packageDir: rootPath, scopeList}).then(out => {
    if (out.depsWereOk === false) {
      const pkgs = out.error.filter(x => x.indexOf(':') !== -1).map(x => x.split(':')[0]);
      // filter out symlinked packages
      const isNotSymlink = pkg => isSymlink(pkgPath(pkg)).then(x => !x);
      return helpers.asyncFilter(pkgs, isNotSymlink).then(unmetPkgs => {
        if (unmetPkgs.length > 0) {
          logger.info(`Using outdated versions of ${unmetPkgs.join(', ')}, trying to update to match package.json versions`);
          return application.install(rootPath, 'npm', isProduction).then(() => cfg, () => cfg);
        }
        return cfg;
      });
    }

    return cfg;
  });
};

const MAX_JOBS = 32;
const setDefaultJobsCount = (options) => {
  if (!options.jobs) return;
  // Mitigates Intel Hyperthreading.
  const str = options.jobs || process.env.BRUNCH_JOBS || cpus.length / 2;
  const parsed = parseInt(str);
  const jobs = (isNaN(parsed) || parsed < 1 || parsed > MAX_JOBS) ? 1 : parsed;
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
    setDefaultJobsCount(options);

    application.loadConfig(persistent, options).then(setProp(this, 'config'))
      .then(cfg => checkProjectDependencies(cfg))
      .then(cfg => {
        if (options.jobs && options.jobs > 1) {
          workers.init(persistent, options, cfg);
        }
        this.fileList = new fsUtils.FileList(cfg, this);
        return Promise.all([
          getWatchedPaths(cfg).then(setProp(this, '_watchedPaths')),
          serveBrunch.serve(cfg.server).then(setProp(this, 'server')),
          plugins.init(cfg, onCompile).then(setProp(this, 'plugins'))
        ]);
      })
      .then(() => {
        const cfg = this.config;
        const plugins = this.plugins;
        if (cfg.hot) {
          checkHmrAutoReload(cfg, plugins);
        }
      })
      .then(() => this.initCompilation())
      .catch(error => {
        let text = typeof error === 'string' ? error : '';
        text = error.code !== 'BRSYNTAX' ? 'Initialization error - ' + text : text;
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

    const nothingToCompile = "Nothing to compile. Most likely you don't have any source files yet, in which case, go ahead and create some! Otherwise, you probably don't have any plugin handling your source files. (For plain javascript, that would be \"javascript-brunch\")";
    if (!cfg.persistent) {
      process.on('exit', (code) => {
        if (this.fileList.files.size === 0) {
          logger.warn(nothingToCompile);
        }
        process.exit(code);
      });
    } else {
      setTimeout(() => {
        if (this.fileList.files.size === 0) {
          logger.warn(nothingToCompile);
        }
      }, 1000);
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
        speed.profile('Watcher is ready');
        this.watcherIsReady = true;
      });
  }

  restartBrunch(reinstallType) {
    const restart = () => {
      this.fileList.dispose();
      this.watcher.close();
      workers.close();
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
      const canTryRecover = error.find(err => err.toString().indexOf('run `npm install`') !== -1);

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
    const start = this._startTime || (this._startTime = Date.now());
    return start;
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
  if (!callback) callback = Function.prototype;

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
