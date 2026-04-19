'use strict';
const sysPath = require('path');
const spawn = require('child_process').spawn;
const debug = require('debug')('brunch:server');
const logger = require('loggy');
const pushserve = require('pushserve');

const longCallbackTime = 4000; // ms.

// config: {port, hostname, command, path, publicPath}
const launch = (options, callback) => {
  if (!callback) callback = Function.prototype;
  const port = parseInt(options.port, 10);
  const host = options.hostname || 'localhost';
  const serverCommand = options.command;
  const serverPath = options.path;
  const publicPath = options.publicPath;
  const startupLogging = options.startupLogging == null ?
    true :
    options.startupLogging;
  let customServerTimeout;
  let server;

  const serverCb = () => {
    clearTimeout(customServerTimeout);
    if (startupLogging) {
      if (serverPath || serverCommand) {
        logger.info('custom server started, initializing watcher');
      } else {
        let ifshow;

        // show ipv4 urls
        if (host === '0.0.0.0') {
          const os = require('os');
          const ifaces = os.networkInterfaces();
          Object.keys(ifaces).forEach(function (ifname) {
            let alias = 0;
            ifaces[ifname].forEach(function (iface) {
              if ('IPv4' === iface.family) { // && iface.internal == false) {
                ifshow = (alias > 0) ? `${ifname}:${alias}` : ifname;
                logger.info(`application started on http://${iface.address}:${port}/ (${ifshow})`);
                alias++;
              }
            });
          });
        }

        // ensure a url is always shown
        if (!ifshow) logger.info(`application started on http://${host}:${port}/`);
      }
    }
    callback(null, server);
  };
  if (serverPath) {
    if (startupLogging) logger.info('starting custom server');
    try {
      server = require(sysPath.resolve(serverPath));
    } catch (error) {
      logger.error(`couldn't load server ${serverPath}: ${error}`);
    }
    const serverFn = (() => {
      if (typeof server === 'function') {
        return server;
      } else if (server && typeof server.startServer === 'function') {
        return server.startServer.bind(server);
      } else {
        throw new Error('Brunch server file needs to export server function');
      }
    })();
    const opts = {port: port, hostname: host, path: publicPath};
    const serverConfig = Object.assign(opts, options.config || {});
    debug(`Invoking custom startServer with: ${JSON.stringify(serverConfig)}`);
    customServerTimeout = setTimeout(() => {
      if (startupLogging) logger.warn('custom server taking a long time to start');
      if (startupLogging) logger.warn("**don\'t forget to invoke callback()**");
    }, longCallbackTime);
    switch (serverFn.length) {
      case 1:
        return serverFn(serverCb);
      case 2:
        return serverFn(serverConfig, serverCb);
      default:
        return serverFn(port, publicPath, serverCb);
    }
  } else if (serverCommand) {
    const commandComponents = serverCommand.split(' ');
    debug(`Invoking custom server command with: ${serverCommand}`);
    if (!commandComponents.length) {
      throw new Error('Invalid custom server command');
    }
    /* fn to kill the custom server */
    const child = spawn(commandComponents.shift(), commandComponents, {
      stdio: 'inherit'
    });
    child.close = cb => {
      child.kill();
      return typeof cb === 'function' ? cb() : undefined;
    };
    setImmediate(serverCb);
    return child;
  } else {
    const opts = {noLog: true, path: publicPath};
    return pushserve(Object.assign(opts, options), serverCb);
  }
};

exports.serve = (config) => {
  if (!config) config = {run: true};
  if (!config.run) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    let server;
    server = launch(config, error => {
      if (error) return reject(error);
      return resolve(server);
    });
  });
};
