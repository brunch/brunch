'use strict';

const esprima = require('esprima');

class JavaScriptCompiler {
  constructor(config) {
    const js = config.plugins.javascript || {};
    this.validate = 'validate' in js ? js.validate : true;
  }

  compile(file) {
    if (this.validate && !file.map) {
      try {
        const errors = esprima.parse(file.data, {tolerant: true});
        if (errors.length) throw errors.map(error => error.message);
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return Promise.resolve(file);
  }
}

JavaScriptCompiler.prototype.brunchPlugin = true;
JavaScriptCompiler.prototype.type = 'javascript';
JavaScriptCompiler.prototype.extension = 'js';

module.exports = JavaScriptCompiler;
