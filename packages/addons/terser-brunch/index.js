'use strict';
const {minify} = require('terser');
const anymatch = require('anymatch');

const formatError = err => {
  err.message = `L${err.line}:${err.col} ${err.message}`;
  return err;
};

class TerserOptimizer {
  constructor(config = {}) {
    const {ignored, ...options} = config.plugins.terser || {};

    this.isIgnored = ignored ? anymatch(ignored) : () => false;
    this.options = {
      sourceMap: !!config.sourceMaps,
      ...options,
    };
  }

  async optimize(file) {
    if (this.isIgnored(file.path)) {
      return {
        data: file.data,
        map: file.map && `${file.map}`,
      };
    }

    const options = {...this.options};
    if (file.map) {
      options.sourceMap = {
        content: JSON.stringify(file.map),
        url: `${file.path}.map`,
      };
    }

    try {
      const res = await minify(file.data, options);
      if (!res.map) return {data: res.code};

      return {
        data: res.code.replace(/\/\/# sourceMappingURL=\S+$/, ''),
        map: res.map,
      };
    } catch (error) {
      throw formatError(error);
    }
  }
}

TerserOptimizer.prototype.brunchPlugin = true;
TerserOptimizer.prototype.type = 'javascript';

module.exports = TerserOptimizer;
