'use strict';

const sysPath = require('path');
const stylus = require('stylus');
const nib = require('nib');
const progeny = require('progeny');

const postcss = require('postcss');
const postcssModules = require('postcss-modules');

const cssModulify = (path, data, map) => {
  let json = {};
  // eslint-disable-next-line
  const getJSON = (_, _json) => json = _json;

  return postcss([postcssModules({getJSON})]).process(data, {from: path, map}).then(x => {
    const exports = `module.exports = ${JSON.stringify(json)};`;
    return {
      exports,
      data: x.css,
      map: x.map,
    };
  });
};

const re = /(([./\w]+)((:\d+){2}))/;
const getError = error => {
  error.name = '';
  const str = error.toString();
  const match = str.match(re);
  const text = str.replace(match[1], '');
  const msg = `L${match[3].slice(1)} ${text}`;
  const err = new Error(msg);
  err.name = '';
  err.stack = error.stack;
  return err;
};

class StylusCompiler {
  constructor(cfg) {
    if (cfg == null) cfg = {};
    this.rootPath = cfg.paths.root;
    this.config = cfg.plugins && cfg.plugins.stylus || {};
    this.modules = this.config.modules || this.config.cssModules;
    delete this.config.modules;
    delete this.config.cssModules;
    this._progeny = progeny({rootPath: this.rootPath});
  }

  getDependencies(file) {
    return new Promise((resolve, reject) => {
      this._progeny(file.path, file.data, (error, deps) => {
        if (error) reject(error);
        else resolve(deps);
      });
    });
  }

  compile(file) {
    const data = file.data;
    const path = file.path;

    const cfg = this.config || {};
    const compiler = stylus(data)
      .set('filename', path)
      .set('compress', false)
      .set('firebug', !!cfg.firebug)
      .set('linenos', !!cfg.linenos)
      .set('include css', true)
      .include(sysPath.join(this.rootPath))
      .include(sysPath.dirname(path))
      .use(nib());

    const defines = cfg.defines || {};
    const paths = cfg.paths;
    const imports = cfg.imports;
    const plugins = cfg.plugins;

    Object.keys(defines).forEach(name => {
      compiler.define(name, defines[name]);
    });

    if (Array.isArray(paths)) {
      paths.forEach(path => compiler.include(path));
    }
    if (Array.isArray(imports)) {
      imports.forEach(relativePath => compiler.import(relativePath));
    }
    if (Array.isArray(plugins)) {
      const handler = plugin => compiler.use(plugin());
      plugins.forEach(pluginName => {
        if (typeof pluginName === 'function') {
          compiler.use(pluginName);
        } else if (Array.isArray(pluginName)) {
          const pluginModule = require(pluginName[0]);
          handler(pluginModule[pluginName[1]]);
        } else {
          handler(require(pluginName));
        }
      });
    }

    return new Promise((resolve, reject) => {
      compiler.render((error, data) => {
        if (error) return reject(getError(error));

        if (this.modules) {
          cssModulify(path, data).then(resolve, reject);
        } else {
          resolve({data});
        }
      });
    });
  }
}

StylusCompiler.prototype.brunchPlugin = true;
StylusCompiler.prototype.type = 'stylesheet';
StylusCompiler.prototype.extension = 'styl';
StylusCompiler.prototype.targetExtension = 'css';

module.exports = StylusCompiler;
