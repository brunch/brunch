'use strict';

const coffee = require('coffeescript');
const normalizeChecker = checker => {
  if (typeof checker === 'function') return checker;
  if (checker instanceof RegExp) return path => checker.test(path);

  return () => false;
};
const formatError = err => {
  // console.log(err.message);
  const loc = err.location;
  let msg = `${err.name}: ${err.message}\n${err.code}`;
  if (loc) {
    msg = `L${loc.first_line + 1}:${loc.first_column + 1} ${msg}`;
  }
  const error = new Error(msg);
  error.name = '';
  error.stack = err.stack;
  return error;
};

class CoffeeScriptCompiler {
  constructor(config) {
    const plugin = config.plugins.coffeescript || {};
    this.bare = plugin.bare;
    this.transpile = plugin.transpile;
    this.sourceMaps = config.sourceMaps;
    this.isVendor = normalizeChecker(config.conventions.vendor);
  }

  compile(file) {
    const data = file.data;
    const path = file.path;
    let compiled;

    const options = {
      filename: path,
      sourceFiles: [path],
      bare: this.bare == null ? !this.isVendor(path) : this.bare,
      literate: coffee.helpers.isLiterate(path),
    };

    if (this.transpile) {
      options.transpile = {filename: path};
      if (typeof this.transpile === 'object') {
        Object.assign(options.transpile, this.transpile);
      }
    }

    if (this.sourceMaps === 'inline') {
      options.inlineMap = true;
    } else if (this.sourceMaps) {
      options.sourceMap = true;
    }

    try {
      compiled = coffee.compile(data, options);
    } catch (err) {
      return Promise.reject(formatError(err));
    }

    const result = typeof compiled === 'string' ?
      {data: compiled} :
      {data: compiled.js, map: compiled.v3SourceMap};

    return Promise.resolve(result);
  }
}

CoffeeScriptCompiler.prototype.brunchPlugin = true;
CoffeeScriptCompiler.prototype.type = 'javascript';
CoffeeScriptCompiler.prototype.pattern = /\.(coffee(\.md)?|litcoffee)$/;

module.exports = CoffeeScriptCompiler;
