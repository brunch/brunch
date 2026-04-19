'use strict';

const eco = require('eco');
const umd = require('umd-wrapper');

class EcoCompiler {
  constructor(config) {
    const options = config && config.plugins && config.plugins.eco || {};

    if (options) {
      if (typeof options.overrides === 'function') {
        options.overrides(eco);
      }
      this.namespace = options.namespace;
    }
  }


  compile(params) {
    const data = params.data;
    const path = params.path;

    let error, result;

    return new Promise((resolve, reject) => {
      try {
        const source = eco.compile(data).toString();
        const ns = this.namespace;
        const key = path.replace(/^.*templates\//, '').replace(/\..+?$/, '');

        result = ns ?
          `if (typeof ${ns} === 'undefined'){ ${ns} = {} }; ${ns}['"${key}'] = ${source}` :
          umd(source);
      } catch (err) {
        error = err;
      } finally {
        if (error) return reject(error);
        resolve(result);
      }
    });
  }
}

EcoCompiler.prototype.brunchPlugin = true;
EcoCompiler.prototype.type = 'template';
EcoCompiler.prototype.extension = 'eco';

module.exports = EcoCompiler;
