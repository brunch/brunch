'use strict';

const postcss = require('postcss');
const postcssModules = require('postcss-modules');

const cssModulify = (path, data, map, options) => {
  let json = {};
  const getJSON = (_, _json) => json = _json;

  return postcss([postcssModules(Object.assign({}, {getJSON}, options))])
    .process(data, {from: path, map}).then(x => {
      const exports = 'module.exports = ' + JSON.stringify(json) + ';';
      return { data: x.css, map: x.map, exports };
    });
};

class CSSCompiler {
  constructor(cfg) {
    if (cfg == null) cfg = {};
    this.config = cfg.plugins && cfg.plugins.css || {};
    this.modules = !!(this.config.modules || this.config.cssModules);
  }
  compile(params) {
    if (this.modules) {
      const moduleOptions = this.modules === true ? {} : this.modules;
      return cssModulify(params.path, params.data, params.map, moduleOptions);
    } else {
      return Promise.resolve(params);
    }
  }
}

CSSCompiler.prototype.brunchPlugin = true;
CSSCompiler.prototype.type = 'stylesheet';
CSSCompiler.prototype.extension = 'css';

module.exports = CSSCompiler;
