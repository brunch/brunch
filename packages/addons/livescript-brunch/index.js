'use strict';

const livescript = require('livescript');

class LiveScriptCompiler {
  constructor(config) {
    if (config == null) config = {};
    const plugins = config.plugins && config.plugins.livescript;
    this.map = !!config.sourceMaps ? 'linked' : 'none';
    this.bare = plugins && plugins.bare;
    if (this.bare == null) this.bare = true;
    this.const = plugins && plugins.const;
    if (this.const == null) this.const = false;
  }

  compile(params) {
    const data = params.data;
    const path = params.path;

    return new Promise((resolve, reject) => {
      let compiled;
      try {
        compiled = livescript.compile(data, {
          filename: path,
          map: this.map,
          bare: this.bare,
          const: this.const,
          header: false
        });
      } catch (error) {
        return reject(error.toString());
      }
      if (this.map === 'linked') {
        var code = compiled.code.replace('//# sourceMappingURL=undefined.map\n', '');
        resolve({data: code, map: compiled.map.toString()});
      } else {
        resolve(compiled);
      }
    });
  }
}

LiveScriptCompiler.prototype.brunchPlugin = true;
LiveScriptCompiler.prototype.type = 'javascript';
LiveScriptCompiler.prototype.extension = 'ls';

module.exports = LiveScriptCompiler;
