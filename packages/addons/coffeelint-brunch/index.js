'use strict';
const linter = require('coffeelint');
const fs = require('fs');

const formatError = error => {
  //const evidence = (error.rule ? '\n\n' + error.rule + '\n' : '\n');
  return error.level + ': ' + error.rule + ' at line ' + error.lineNumber + '. ' + (error.context || '');
};

class CoffeeLinter {
  constructor(config) {
    this.config = config || {};
    const cfg = config.plugins && config.plugins.coffeelint || config.coffeelint || {};
    if (config.coffeelint) {
      console.warn('Warning: config.coffeelint is deprecated, move it to config.plugins.coffeelint');
    }
    this.useCoffeelintJson = cfg.useCoffeelintJson;
    const watchedPaths = this.config && this.config.paths && this.config.paths.watched || ['app'];
    this.pattern = cfg.pattern || new RegExp(`(${watchedPaths.join('|')}).*\.coffee$`);
    if (this.useCoffeelintJson) {
      try {
        const coffeelintJson = JSON.parse(fs.readFileSync('coffeelint.json'));
        this.options = coffeelintJson;
      } catch (_error) {
        throw new Error('useCoffeelintJson is true but coffeelint.json does not exist');
      }
    } else {
      this.options = cfg.options;
    }
  }

  lint(data, _) { //eslint-disable-line no-unused-vars
    try {
      const error = linter.lint(data, this.options).filter(err => err != null).map(formatError).join('\n');
      if (error) return Promise.reject(error);
    } catch (error) {
      return Promise.reject(error);
    }

    return Promise.resolve();
  }
}

CoffeeLinter.prototype.brunchPlugin = true;
CoffeeLinter.prototype.type = 'javascript';
CoffeeLinter.prototype.extension = 'coffee';

module.exports = CoffeeLinter;
