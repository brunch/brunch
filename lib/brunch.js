'use strict';
const loggy = require('loggy');
const sysPath = require('universal-path');
// const serveBrunch = require('serve-brunch');
const install = require('deps-install');
const EventEmitter = require('events');
const Logger = require('./logger');
const config = require('./config');
const chokidar = require('chokidar');
const {debounce} = require('./utils');
// const isRecoverable = err => err.code === 'DEPS_RESOLVE_INSTALL';

class Brunch extends EventEmitter {
  constructor(configPath, partConfig) {
    super();

    this._configPath = configPath;
    this._partConfig = partConfig;

    config.init(this._partConfig);

    const FileList = require('./file-list');
    this._fileList = new FileList();
    this._write = debounce(this._write, config.fileListInterval);
    // this._server = serveBrunch.serve(config.server);
    this._setupHooks();
    this._logger = new Logger();
  }

  * init__async__() {
    const preCompile = this.listeners('preCompile').map(fn => fn());
    // return Promise.all([...preCompile, this._server.ready])
    // move out init
    yield Promise.all(preCompile);
    this._initWatcher();
  }

  _initConfig() {
    try {
      // TODO: make friendly error message if coffee is missing
      require('coffee-script/register');
    } catch (err) {
      // coffee is optional since 3.0
    }

    try {
      const resolved = sysPath.resolve(configPath);
      return require(resolved);
    } catch (err) {
      //
    }
  }

  restart() {
    const brunch = new Brunch(this._partConfig);
    this.emit('restart', brunch);

    const restart = () => {
      return brunch;
    };

    clearTimeout(this.nothingToCompileTimer);
    this._fileList.dispose();
    this._watcher.close();

    loggy.info('Reloading watcher...');
    this.emit('teardown');
    const {server} = this;
    if (server && typeof server.close === 'function') {
      return server.close(restart);
    }

    return restart();
  }

  _initCompilation() {
    const rootPath = cfg.paths.root;
    this.plugins.includes.forEach(path => {
      const relPath = sysPath.relative(rootPath, path);

      // Emit `change` event for each file that is included with plugins.
      this.startCompilation('change', relPath);
      // cfg.npm.static.push(relPath);
    });
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

  initWatcher() {
    const {paths} = config;

    const configPath = require.resolve(this._configPath);

    this._watcher = chokidar.watch(

      Object.assign({ignored}, watcher)
    ).on('add', absPath => {
      const path = sysPath.relative(paths.root, absPath);

      if (isConfig(path)) return; // Pass for the initial files.
      this.startCompilation('change', path);
    }).on('change', absPath => {
      const path = sysPath.relative(paths.root, absPath);

      if (path === paths.packageConfig) {
        install({rootPath: config.paths.root}).then(() => {
          this.restart();
        });
      } else if (path === configPath) {
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

  * _write__async__() {
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
