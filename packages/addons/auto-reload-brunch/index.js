'use strict';

const sysPath = require('path');
const fs = require('fs');
const https = require('https');
const WebSocketServer = require('ws').Server;
const isWorker = require('cluster').isWorker;
const anymatch = require('anymatch');

const startingPort = 9485;
const portTryPool = 10;
const fileName = 'auto-reload.js';

class AutoReloader {
  constructor(config) {
    if (config == null) config = {};
    if (config.autoReload) {
      throw new Error('Warning: config.autoReload is no longer supported, please move it to config.plugins.autoReload');
    }
    const cfg = this.config = config.plugins && config.plugins.autoReload || {};

    if (cfg.port == null) {
      this.ports = [];
      for (var i = 0; i <= portTryPool; i++) this.ports.push(startingPort + i);
    } else {
      this.ports = Array.isArray(cfg.port) ? cfg.port.slice() : [cfg.port];
    }

    if (cfg.host != null) {
      this.host = cfg.host;
    }

    if (config.persistent) {
      this.enabled = cfg.enabled == null ? true : cfg.enabled;
    }
    this.hot = config.hot;
    this.delay = cfg.delay;
    this.cssMatch = cfg.match && cfg.match.stylesheets || /\.css$/;
    this.jsMatch = cfg.match && cfg.match.javascripts || /\.js$/;
    this.forcewss = !!cfg.forcewss;

    this.connections = [];
    this.port = this.ports.shift();

    if (cfg.keyPath && cfg.certPath) {
      this.key = fs.readFileSync(cfg.keyPath);
      this.cert = fs.readFileSync(cfg.certPath);
      this.ssl = !!(this.key && this.cert);
    }

    if (this.enabled && !isWorker) this.startServer();
  }

  startServer() {
    const conns = this.connections;
    const cfg = this.config;
    const host = cfg.host || '0.0.0.0';
    const port = this.port;

    if (this.ssl) {
      this.httpsServer = https.createServer({key: this.key, cert: this.cert});
      this.httpsServer.listen(port, host);
      this.server = new WebSocketServer({server: this.httpsServer});
    } else {
      this.server = new WebSocketServer({host, port});
    }
    this.server.on('connection', conn => {
      conns.push(conn);
      conn.on('close', () => conns.splice(conns.indexOf(conn), 1));
    });
    this.server.on('error', error => {
      if (error.toString().match(/EADDRINUSE/)) {
        if (this.ports.length) {
          this.port = this.ports.shift();
          this.startServer();
        } else {
          error = `cannot start because port ${port} is in use`;
        }
      }
    });
  }

  onCompile(changedFiles) {
    const enabled = this.enabled;
    const conns = this.connections;
    if (!enabled) return;

    const didCompile = changedFiles.length > 0;
    const isCss = file => anymatch(this.cssMatch, file.path);
    const isJs = file => anymatch(this.jsMatch, file.path);
    const isJsOrCss = file => isJs(file) || isCss(file);

    const allCss = didCompile && changedFiles.every(isCss);
    const allJs = this.hot && didCompile && changedFiles.every(isJs);
    const allJsOrCss = this.hot && didCompile && changedFiles.every(isJsOrCss);

    if (toString.call(enabled) === '[object Object]') {
      if (!(didCompile || enabled.assets)) return;
      if (allCss) {
        if (!enabled.css) return;
      } else if (didCompile) {
        const changedExts = changedFiles.map(x => sysPath.extname(x.path).slice(1));
        const wasChanged = !Object.keys(enabled).some(k => enabled[k] && changedExts.indexOf(k) !== -1);
        if (wasChanged) return;
      }
    }

    const messages = [];
    if (allJs || allJsOrCss) messages.push('javascript');
    if (allCss || allJsOrCss) messages.push('stylesheet');
    if (messages.length === 0) messages.push('page');
    const sendMessage = () => {
      conns
        .filter(connection => connection.readyState === 1)
        .forEach(connection => messages.forEach(message => connection.send(message)));
    };

    if (this.delay) {
      setTimeout(sendMessage, this.delay);
    } else {
      sendMessage();
    }
  }

  get include() {
    return this.enabled ?
      [sysPath.join(__dirname, 'vendor', fileName)] : [];
  }

  teardown() {
    if (this.server) this.server.close();
    if (this.httpsServer) this.httpsServer.close();
  }

  compile(file) {
    let finalData = file.data;

    if (this.enabled &&
        this.port !== startingPort &&
        sysPath.basename(file.path) === fileName) {
      finalData = finalData.replace(startingPort, this.port);
    }
    if (this.enabled && (this.forcewss || this.ssl) &&
        sysPath.basename(file.path) === fileName) {
      finalData = finalData.replace('ws://', 'wss://');
    }
    if (this.enabled && this.host &&
        sysPath.basename(file.path) === fileName) {
      finalData = finalData.replace(/var host = .*/, `var host = "${this.host}"`);
    }

    return Promise.resolve(finalData);
  }
}

AutoReloader.prototype.supportsHMR = true;

AutoReloader.prototype.brunchPlugin = true;
AutoReloader.prototype.type = 'javascript';
AutoReloader.prototype.extension = 'js';

module.exports = AutoReloader;
