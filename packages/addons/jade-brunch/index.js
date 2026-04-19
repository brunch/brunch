'use strict';

const jade = require('jade');
const sysPath = require('path');
const umd = require('umd-wrapper');
const progeny = require('progeny');

// perform a deep cloning of an object
const clone = (obj) => {
  if (null == obj || 'object' !== typeof obj) return obj;
  const copy = obj.constructor();
  for (const attr in obj) {
    if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
  }
  return copy;
};

class JadeCompiler {
  constructor(cfg) {
    if (cfg == null) cfg = {};
    const defaultBaseDir = sysPath.join(cfg.paths.root, 'app');
    const defaultStaticBaseDir = sysPath.join(defaultBaseDir, 'assets');
    const jade = cfg.plugins && cfg.plugins.jade;
    const config = (jade && jade.options) || jade;

    // Allow runtime to be excluded
    if (config && config.noRuntime) {
      this.include = [];
    }

    // cloning is mandatory because config is not mutable
    this.locals = jade && jade.locals || {};
    this.options = clone(config) || {};
    this.options.compileDebug = false;
    this.options.client = true;
    this.options.basedir = (config && config.basedir) || defaultBaseDir;
    this.options.staticBasedir = (config && config.staticBasedir) || defaultStaticBaseDir;

    const getDependencies = progeny({
      rootPath: this.options.basedir,
      reverseArgs: true
    });

    const getDependenciesStatic = progeny({
      rootPath: this.options.staticBasedir,
      reverseArgs: true
    });

    this.getDependencies = (data, path, cb) => {
      if (sysPath.resolve(path).indexOf(sysPath.resolve(this.options.staticBasedir)) === 0) {
        return getDependenciesStatic(data, path, cb);
      } else {
        return getDependencies(data, path, cb);
      }
    };
  }

  compile(params) {
    const data = params.data;
    const path = params.path;

    const options = clone(this.options);
    options.filename = path;

    return new Promise((resolve, reject) => {
      let result, error;
      try {
        let compiled;
        // cloning is mandatory because Jade changes it
        if (options.preCompile === true) {
          const precompiled = jade.compile(data, options)();
          compiled = JSON.stringify(precompiled);
        } else {
          compiled = jade.compileClient(data, options);
        }
        result = umd(compiled);
      } catch (_error) {
        error = _error;
      } finally {
        if (error) return reject(error);
        resolve(result);
      }
    });
  }

  compileStatic(params) {
    const data = params.data;
    const path = params.path;

    const options = Object.assign({}, this.options);
    const locals = Object.assign({}, this.locals);
    try {
      options.filename = path;
      options.basedir = options.staticBasedir;
      locals.filename = path.replace(new RegExp('^' + options.basedir + '/'), '');
      const fn = jade.compile(data, options);
      const compiled = fn(locals);
      return Promise.resolve(compiled);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

let jadePath = require.resolve('jade');

while (sysPath.basename(jadePath) !== 'jade') {
  jadePath = sysPath.dirname(jadePath);
}

JadeCompiler.prototype.include = [
  sysPath.join(jadePath, 'runtime.js')
];

JadeCompiler.prototype.brunchPlugin = true;
JadeCompiler.prototype.type = 'template';
JadeCompiler.prototype.extension = 'jade';
JadeCompiler.prototype.staticTargetExtension = 'html';

module.exports = JadeCompiler;
