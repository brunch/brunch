'use strict';

const CleanCSS = require('clean-css');

class CleanCSSMinifier {
  constructor(config) {
    this.options = config && config.plugins && config.plugins.cleancss || {};
  }

  optimize(file) {
    const data = file.data;
    const path = file.path;

    try {
      if (this.options.ignored && this.options.ignored.test(path)) {
        // ignored file path: return non minified
        return Promise.resolve(data);
      }
    } catch (e) {
      return Promise.reject(`error checking ignored files to minify ${e}`);
    }

    try {
      const min = new CleanCSS(this.options).minify(data);
      return Promise.resolve(min.styles || data);
    } catch (error) {
      return Promise.reject(`CSS minify failed on ${path}: ${error}`);
    }
  }
}

CleanCSSMinifier.prototype.brunchPlugin = true;
CleanCSSMinifier.prototype.type = 'stylesheet';

module.exports = CleanCSSMinifier;
