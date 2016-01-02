'use strict';
const sysPath = require('path');
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
    this._start = Date.now();

    application.loadConfig(options.config, cfgParams).then(setProp(this, 'config'))
      .then(cfg => {
        this.fileList = new fsUtils.FileList(cfg);
        return Promise.all([
          initWatcher(cfg).then(setProp(this, 'watcher')),
          server.init(cfg).then(setProp(this, 'server')),
          plugins.init(cfg, onCompile).then(setProp(this, 'plugins'))
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
