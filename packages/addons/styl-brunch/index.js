'use strict';

const styl = require('./styl');
const functions = require('rework-plugin-function');
const sysPath = require('path');

class StylPlugin {
  constructor(config) {
    if (!config) config = {};
    this.rootPath = (config.paths || {}).root || '.';
    const styl = this.config = config.plugins && config.plugins.styl || {};
    if (styl.functions) {
      this.functions = functions(styl.functions);
    }
  }

  compile(params) {
    const data = params.data;
    const path = params.path;

    const dir = sysPath.dirname(path);
    const options = {
      whitespace: true,
      path: [dir, this.rootPath],
      functions: this.functions
    };

    return new Promise((resolve, reject) => {
      try {
        new styl(data, options).compile((err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      } catch (_error) {
        reject(_error);
      }
    });
  }
}

StylPlugin.prototype.brunchPlugin = true;
StylPlugin.prototype.type = 'stylesheet';
StylPlugin.prototype.extension = 'styl';

module.exports = StylPlugin;
