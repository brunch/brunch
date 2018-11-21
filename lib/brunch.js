'use strict';
const loggy = require('loggy');
const sysPath = require('universal-path');
const installDependencies = require('deps-install');
const EventEmitter = require('events');
const Logger = require('./logger');
const normConfig = require('./config');
const chokidar = require('chokidar');
const FileList = require('./files/file-list');

// Object.assign(loggy.notifications, {
//   app: 'Brunch',
//   icon: `${__dirname}/logo.png`,
// });

class Brunch extends EventEmitter {
  constructor(configPath, partConfig) {
    super();

    this._configPath = configPath;
    this._partConfig = partConfig;

    this._config = normConfig(this._partConfig);
    this._fileList = new FileList(this._config);
    this._logger = new Logger();
    this._setupHooks();
  }

  async init() {
    const preCompile = this.listeners('preCompile').map(fn => fn()); // not good
    // move out init
    await Promise.all(preCompile);
    this._initWatcher();
  }

  _initConfig() {
    try {
      // TODO: make friendly error message if coffee is missing
      require('coffeescript/register');
    } catch (err) {
      // coffee is optional since 3.0
    }

    try {
      const resolved = sysPath.resolve(configPath);
      return require(resolved);
    } catch (err) {
      // catch syntax error
    }
  }

  restart() {
    const brunch = new Brunch(this._partConfig);
    loggy.info('Reloading watcher...');

    this._fileList.dispose();
    this._watcher.close();

    this.emit('teardown');
  }

  _initCompilation() {
    const rootPath = cfg.paths.root;
    this.plugins.includes.forEach(path => {
      const relPath = sysPath.relative(rootPath, path);

      // Emit `change` event for each file that is included with plugins.
      this.startCompilation('change', relPath);


      // statics!!!!!!
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
        // BAD. move out pify
      });
    });
  }

  _initWatcher() {
    const {paths} = config;
    const configPath = require.resolve(this._configPath);

    this._watcher = chokidar.watch({
      ignored,
      ...watcher,
    }).on('add', absPath => {
      const path = sysPath.relative(paths.root, absPath);

      if (!isConfig(path)) {
        this.startCompilation('change', path);
      }
    }).on('change', absPath => {
      const path = sysPath.relative(paths.root, absPath);

      if (path === paths.packageConfig) {
        await installDependencies({rootPath: config.paths.root});
        this.restart();
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

  async _write() {
    try {
      const res = await this._fileList.write();
      this._logger.emit('end', ...res);
      this.emit('compile', ...res);
    } catch (err) {
      this._logger.emit('error');
      if (isRecoverable(err)) {
        loggy.warn('Attempting to recover from failed NPM requires by running `npm install`...');
        this.restart('package');
      }
    }
  }

  build(path) {
    // BAD. catch?
    this._method = 'build';
    this._path = path;

    this.on('compile', () => {
      process.on('exit', code => {
        process.exit(logger.errorHappened ? 1 : code);
      });
    });
  }

  watch(path) {
    this._method = 'watch';
    this._path = path;
  }
}

module.exports = Brunch;
