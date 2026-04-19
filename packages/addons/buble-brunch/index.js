'use strict';

const buble = require('buble');
const anymatch = require('anymatch');
const flatten = require('flatten-brunch-map');

const reIgnore = /\b(?:bower_components|node_modules|vendor)\//;

class BrunchBuble {
  constructor(config) {
    this.options = Object.assign({}, config.plugins.buble);

    this.options.sourceMap = !!config.sourceMaps &&
      this.options.sourceMap !== false &&
      this.options.sourceMaps !== false;

    if (this.options.pattern) this.pattern = this.options.pattern;
    this.ignored = anymatch(this.options.ignore || reIgnore);
  }

  compile(file) {
    return new Promise((resolve, reject) => {
      if (this.ignored(file.path)) {
        return resolve(file);
      }

      try {
        const output = buble.transform(file.data, Object.assign(
          {}, this.options, {source: file.path}
        ));

        const sourcemaps = this.options.sourceMap ? output.map : false;
        const result = flatten(file, output.code, sourcemaps);

        return resolve(result);
      } catch (reason) {
        return reject(reason);
      }
    });
  }
}

BrunchBuble.prototype.brunchPlugin = true;
BrunchBuble.prototype.type = 'javascript';
BrunchBuble.prototype.pattern = /\.jsx?$/;

module.exports = BrunchBuble;
