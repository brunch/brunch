'use strict';
const {resolve} = require('path');
const {promisify} = require('util');
const {spawn} = require('child_process');
const debug = require('debug')('brunch:server');
const logger = require('loggy');
const http = require('http');
const handler = require('serve-handler');
const {networkInterfaces} = require('os');

// options types:
// 1. {port, hostname, publicPath}
// 2. {path} (passing options)
// 3. {command}
const COMMAND_TYPE = 'command';
const FILE_TYPE = 'file';
const DEFAULT_TYPE = 'default';
const longCallbackTime = 4000; // ms.

function launchServerFileModule(server, port, publicPath, serverConfig) {
  const launcher = (() => {
    if (typeof server === 'function') {
      return server;
    } else if (server && typeof server.startServer === 'function') {
      return server.startServer.bind(server);
    }
    throw new Error('Brunch server file needs to export server function');
  })();

  switch (launcher.length) {
    // new case
    case 0:
      return launcher();
    case 1:
      return promisify(launcher)();
    case 2:
      return promisify(launcher)(serverConfig);
    default:
      return promisify(launcher)(port, publicPath);
  }
}


class BrunchServer {
  constructor(options = {}) {
    this.type = options.path ?
      FILE_TYPE : options.serverCommand ?
        COMMAND_TYPE : DEFAULT_TYPE;
    this.port = options.port;
    this.hostname = options.hostname;

    // Default server.
    this.startupLogging = options.startupLogging;
    this.indexPath = options.indexPath;
    if (!this.indexPath.startsWith('/')) this.indexPath = '/' + this.indexPath;
    this.noPushState = options.noPushState;
    this.noCors = options.noCors;
    this.stripSlashes = options.stripSlashes;

    // Custom server.
    this.serverCommand = options.command;
    this.serverPath = options.path;
    this.publicPath = options.publicPath || '.';
    this.fileServerConfig = options.config || {};
  }

  start() {
    debug(`starting server of type ${this.type}`);
    switch (this.type) {
      case COMMAND_TYPE: return this.customCommandServer();
      case FILE_TYPE: return this.customFileServer();
      default: return this.defaultStaticServer();
    }
  }

  close() {
    if (this.closed) return Promise.resolve(true);
    this.closed = true;
    return new Promise((resolve, reject) => {
      const callback = error => {
        this._connection = undefined;
        error ? reject(error) : resolve(true);
      };

      switch (this.type) {
        case COMMAND_TYPE:
          this._connection.on('close', () => {
            resolve();
          });
          this._connection.kill();
          this._connection = undefined;
          break;
        case FILE_TYPE:
          clearTimeout(this.customServerTimeout);
          if (!this._connection || !this._connection.close) {
            logger.error('cannot close custom brunch server, no close() method');
            reject('cannot close custom brunch server, no close() method');
          }
          if (this._connection.close.length === 1) {
            this._connection.close(callback);
          } else {
            this._connection.close().then(resolve, reject);
          }
          break;
        default:
          this._connection.removeAllListeners();
          this._connection.close(callback);
          break;
      }
    });
  }

  async customFileServer() {
    // TODO: support for micro(1)-like handlers!
    if (this.startupLogging) {
      logger.info('starting custom server');
    }
    let server;

    try {
      server = require(resolve(this.serverPath));
    } catch (error) {
      logger.error(`couldn't load server ${this.serverPath}: ${error}`);
    }
    this.customServerTimeout = setTimeout(() => {
      if (this.startupLogging) logger.warn('custom server taking a long time to start');
      if (this.startupLogging) logger.warn("**don't forget to invoke callback()**");
    }, longCallbackTime);
    const serverConfig = Object.assign({
      port: this.port, hostname: this.hostname, path: this.publicPath
    }, this.fileServerConfig || {});
    debug(`Invoking custom startServer with: ${JSON.stringify(serverConfig)}`);
    this._connection = await launchServerFileModule(server, this.port, this.publicPath, serverConfig);
    clearTimeout(this.customServerTimeout);

    logger.info('custom server started, initializing watcher');
    return this;
  }

  customCommandServer() {
    const {serverCommand} = this;
    const cmd = serverCommand.split(' ');
    if (!cmd.length) {
      throw new Error(`Invalid custom server command ${serverCommand}`);
    }
    this._connection = spawn(cmd.shift(), cmd, {
      stdio: 'inherit'
    });
    logger.info('custom server started, initializing watcher');
    return Promise.resolve(this);
  }

  defaultStaticServer() {
    const {publicPath, port, hostname} = this;

    const opts = {};
    if (!this.noPushState) {
      opts.rewrites = [{
        source: '**',
        destination: this.indexPath
      }];
    }
    // Send cross-origin resource sharing enabling header.
    if (!this.noCors) {
      opts.headers = [{
        source: '**/*',
        headers: [
          {key: 'Cache-Control', value: 'no-cache'},
          {key: 'Access-Control-Allow-Origin', value: '*'}
        ]
      }];
    }

    if (this.stripSlashes) opts.trailingSlash = false;

    const mergedOptions = Object.assign({}, opts, {public: publicPath});
    const server = new http.Server((req, res) => {
      return handler(req, res, mergedOptions);
    });
    this._connection = server;

    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, hostname, () => {
        let ifshow;
        if (this.hostname === '0.0.0.0') {
          const ifaces = networkInterfaces();
          Object.keys(ifaces).forEach(ifname => {
            let alias = 0;
            ifaces[ifname].filter(iface => iface.family === 'IPv4').forEach(iface => {
              ifshow = alias > 0 ? `${ifname}:${alias}` : ifname;
              logger.info(`app started on http://${iface.address}:${port}/ (${ifshow})`);
              alias++;
            });
          });
        }
        // ensure a url is always shown
        if (!ifshow) logger.info(`app started on http://${hostname}:${port}/`);

        resolve(this);
      });
    });
  }
}

exports.serve = config => {
  return new BrunchServer(config).start();
};
