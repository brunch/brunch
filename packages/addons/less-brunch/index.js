'use strict';

const less = require('less');
const sysPath = require('path');
const progeny = require('progeny');

const postcss = require('postcss');
const postcssModules = require('postcss-modules');

const cssModulify = (path, data, map) => {
  let json = {};
  const getJSON = (_, _json) => json = _json;

  return postcss([postcssModules({getJSON})]).process(data, {from: path, map}).then(x => {
    const exports = 'module.exports = ' + JSON.stringify(json) + ';';
    return { data: x.css, map: x.map, exports };
  });
};

const formatError = path => err => {
  let msg = `${err.type}Error: ${err.message}`;
  if (err.filename) {
    const fn = err.filename === path ? '' : ` of ${err.filename}`;
    msg = `L${err.line}:${err.column}${fn} ${msg}`;
  }
  const error = new Error(msg);
  error.name = '';
  throw error;
};

class LESSCompiler {
  constructor(config) {
    this.config = config.plugins.less || {};
    this.rootPath = config.paths.root;
    this.optimize = config.optimize;

    this.modules = this.config.modules || this.config.cssModules;
    delete this.config.modules;
    delete this.config.cssModules;
  }

  // Get dependencies from file
  _deps(file) {
    return new Promise((resolve, reject) => {
      progeny({rootPath: this.rootPath})(file.path, file.data, (err, deps) => {
        if (!err) {
          const re = /data-uri\s*\(\s*("|'|)([^)]*)\1\s*\)/g;
          let match;
          while (match = re.exec(file.data)) {
            deps.push(sysPath.join(sysPath.dirname(file.path), match[2]));
          }
        }
        if (err) reject(err);
        else resolve(deps);
      });
    });
  }

  // If old API is used, then invoke callback
  // It's needed, because older Brunch doesn't promisify this method
  // Otherwise, just return a promise
  getDependencies(data, path, cb) {
    if (path && cb) {
      return this._deps({data, path})
        .then(deps => cb(null, deps))
        .catch(err => cb(err));
    }
    return this._deps(data);
  }

  compile(file) {
    const data = file.data;
    const path = file.path;
    const paths = [this.rootPath, sysPath.dirname(path)]
          .concat(this.config.options.includePaths);
    const config = Object.assign({}, this.config, {
      paths: paths,
      filename: path,
      dumpLineNumbers: !this.optimize && this.config.dumpLineNumbers
    });

    return less.render(data, config).then(output => {
      const data = output.css;
      return this.modules ? cssModulify(path, data) : {data};
    }, formatError(path));
  }
}

LESSCompiler.prototype.brunchPlugin = true;
LESSCompiler.prototype.type = 'stylesheet';
LESSCompiler.prototype.extension = 'less';


module.exports = LESSCompiler;
