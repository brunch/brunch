'use strict';

const handlebars = require('handlebars');
const umd = require('umd-wrapper');
const sysPath = require('path');

class HandlebarsCompiler {
  constructor(cfg) {
    this.optimize = cfg.optimize;
    const config = cfg.plugins.handlebars || {};
    const overrides = config.overrides;
    if (typeof overrides === 'function') overrides(handlebars);

    const ns = config.namespace;
    this.namespace = typeof ns === 'function' ? ns : () => ns;
    this.pathReplace = config.pathReplace || /^.*templates\//;
    this.includeSettings = config.include || {};
    this.locals = config.locals || {};
  }

  get include() {
    let includeFile = 'handlebars';
    const include = this.includeSettings;
    if (include.runtime !== false) includeFile += '.runtime';
    if (include.amd) includeFile += '.amd';
    if (this.optimize) includeFile += '.min';
    includeFile += '.js';

    return [
      sysPath.join(__dirname, 'dist', includeFile),
      sysPath.join(__dirname, 'ns.js'),
    ];
  }

  compile(file) {
    const path = file.path;
    let data = file.data;

    if (this.optimize) {
      data = data.replace(/^[\x20\t]+/mg, '').replace(/[\x20\t]+$/mg, '');
      data = data.replace(/^[\r\n]+/, '').replace(/[\r\n]*$/, '\n');
    }

    try {
      let result;
      const ns = this.namespace(path);
      const source = `Handlebars.template(${handlebars.precompile(data)})`;

      if (ns) {
        // eslint-disable-next-line prefer-template
        const key = ns + '.' + path.replace(/\\/g, '/').replace(this.pathReplace, '').replace(/\..+?$/, '').replace(/\//g, '.');
        result = `Handlebars.initNS( '${key}' ); ${key} = ${source}`;
      } else {
        result = umd(source);
      }

      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }

  }

  compileStatic(file) {
    try {
      const template = handlebars.compile(file.data);
      const source = template(this.locals);

      return Promise.resolve(source);
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

HandlebarsCompiler.prototype.brunchPlugin = true;
HandlebarsCompiler.prototype.type = 'template';
HandlebarsCompiler.prototype.pattern = /\.(hbs|handlebars)$/;
HandlebarsCompiler.prototype.staticTargetExtension = 'html';

module.exports = HandlebarsCompiler;
