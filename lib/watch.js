'use strict';
const loggy = require('loggy');
const sysPath = require('universal-path');
const chokidar = require('chokidar');
const serveBrunch = require('serve-brunch');
const deppack = require('deppack');
const install = require('deps-install');
const {isMaster} = require('cluster');
const EventEmitter = require('events');
const Logger = require('./logger');

const ignored = require('./is-ignored');
const FileList = require('./file-list');

const config = require('./config');
const plugins = require('./plugins');

const {
  fileExists,
  flatten,
  debounce,
} = require('./helpers');

const canTryRecover = err => err.code === 'DEPS_RESOLVE_INSTALL';

const filterNonExistentPaths = paths => {
  return Promise.all(paths.map(fileExists)).then(values => {
    // watched files
    return paths.filter((path, index) => values[index]);
  });
};

// Filter paths that exist and watch them with `chokidar` package.
const getWatchedPaths = config => {
  const configs = config.paths.allConfigFiles;
  const pkg = config.packageInfo;
  const getFiles = pkgs => flatten(pkgs.components.map(c => c.files));
  const watched = config.paths.watched.concat(configs, getFiles(pkg.npm));
  return filterNonExistentPaths(watched);
};

class Brunch extends EventEmitter {
  constructor(partConfig) {
    super();

    this._partConfig = partConfig;
    this._logger = new Logger();
  }

  init() {
    config.init(this._partConfig).then(() => {
      plugins.init();

      this._fileList = new FileList();
      this._write = debounce(this._write, raw.fileListInterval);
      this._server = serveBrunch.serve(raw.server);
      this._setupHooks();

      const preCompile = this.listeners('preCompile').map(fn => fn());

      return Promise.all([...preCompile, this._server.ready])
        .then(() => {
          this._initWatcher();
        });
    }).catch(error => {
      loggy.error(error);
      process.exit(1);
    });
  }

  restart(pkgType) {
    const restart = () => {
      const brunch = new Brunch(this._partConfig);
      this.emit('restart', brunch);
      return brunch;
    };

    const rootPath = config.raw.paths.root;
    const reWatch = () => {
      loggy.info('Reloading watcher...');
      this.emit('teardown');
      const {server} = this;
      if (server && typeof server.close === 'function') {
        return server.close(restart);
      }

      return restart();
    };

    clearTimeout(this.nothingToCompileTimer);
    this._fileList.dispose();
    this._watcher.close();

    return install({rootPath, pkgType}).then(reWatch, reWatch);
  }

  _initCompilation() {
    const rootPath = cfg.paths.root;
    this.plugins.includes.forEach(path => {
      const relPath = sysPath.relative(rootPath, path);

      // Emit `change` event for each file that is included with plugins.
      this.startCompilation('change', relPath);
      cfg.npm.static.push(relPath);
    });

    Object.freeze(cfg.npm.static);
  }

  _setupHooks() {
    const {hooks} = config;

    Object.keys(hooks).forEach(hook => {
      [...plugins.respondTo(hook), hooks].forEach(ctx => {
        const fn = ctx[hook].bind(ctx);
        const pify = hook === 'preCompile' && fn.length;

        this.on(hook, pify ? () => new Promise(fn) : fn);
      });
    });
  }

  _initWatcher() {
    const norm = this.config._normalized;
    const {paths, watcher} = norm;

    const isConfig = path => paths.allConfigFiles.includes(path);

    this._watcher = chokidar.watch(

      Object.assign({ignored}, watcher)
    ).on('add', absPath => {
      const path = sysPath.relative(paths.root, absPath);

      if (isConfig(path)) return; // Pass for the initial files.
      this.startCompilation('change', path);
    }).on('change', absPath => {
      const path = sysPath.relative(paths.root, absPath);

      if (path === paths.packageConfig) {
        this.restart('package');
      } else if (isConfig(path)) {
        this.restart();
      } else {
        this.startCompilation('change', path);
      }
    }).on('unlink', absPath => {
      const path = sysPath.relative(paths.root, absPath);

      if (isConfig(path)) {
        loggy.info(`Detected removal of ${path}\nExiting.`);
        process.exit(0);
      } else {
        this.startCompilation('unlink', path);
      }
    }).on('error', loggy.error);
  }

  _write() {
    this._fileList.write().then(res => {
      this._logger.emit('end', ...res);
      this.emit('compile', ...res);
    }).catch(errs => {
      this._logger.emit('error');
      errs.forEach(err => loggy.error(err));
      if (errs.some(canTryRecover)) {
        loggy.warn('Attempting to recover from failed NPM requires by running `npm install`...');
        this.restart('package');
      }
    });
  }

  _reemit(...args) {
    this._logger.emit('start');
    this._fileList.emit(...args);
  }

  exit() {

  }
}

module.exports = Brunch;
