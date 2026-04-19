/* eslint camelcase: 0 */

'use strict';

const sysPath = require('path');
const progeny = require('progeny');
const sass = require('sass');
const anymatch = require('anymatch');
const nodeSassGlobImporter = require('node-sass-glob-importer');

const postcss = require('postcss');
const postcssModules = require('postcss-modules');

const cssModulify = (path, data, map, options) => {
  let json = {};
  const getJSON = (_, _json) => json = _json; // eslint-disable-line

  return postcss([postcssModules(Object.assign({}, {getJSON}, options))])
    .process(data, {from: path, map}).then(x => {
      const exports = `module.exports = ${JSON.stringify(json)};`;
      return {
        exports,
        data: x.css,
        map: x.map,
      };
    });
};

const sassRe = /\.sass$/;

const formatRe = /(on line \d+ of ([/.\w]+))/;
const formatError = (path, err) => {
  // TODO fix error parsing with dart-sass
  try {
    let loc = `L${err.line}:${err.column}`;
    let code = err.formatted.replace(`Error: ${err.message}`, '');
    const match = code.match(formatRe);
    code = code.replace(formatRe, '');
    const erroredPath = match[2];

    loc += erroredPath === path ? ': ' : ` of ${erroredPath}. `;

    const error = new Error(`${loc}\n${err.message} ${code}`);
    error.name = '';
    return error;
  } catch (doubleError) {
    return err;
  }
};

class SassCompiler {
  constructor(cfg = {}) {
    this.rootPath = cfg.paths.root;
    this.optimize = cfg.optimize;
    this.config = cfg.plugins && cfg.plugins.sass || {};
    this.modules = this.config.modules || this.config.cssModules;

    if (this.modules && this.modules.ignore) {
      this.isIgnored = anymatch(this.modules.ignore);
      delete this.modules.ignore;
    } else {
      this.isIgnored = anymatch([]);
    }

    delete this.config.modules;
    delete this.config.cssModules;

    if (this.config.options != null && this.config.options.includePaths != null) {
      this.includePaths = this.config.options.includePaths;
    }

  }

  _getIncludePaths(path) {
    let includePaths = [this.rootPath, sysPath.dirname(path)];
    if (Array.isArray(this.includePaths)) {
      includePaths = includePaths.concat(this.includePaths);
    }
    return includePaths;
  }

  get getDependencies() {
    return progeny({
      rootPath: this.rootPath,
      altPaths: this.includePaths,
      reverseArgs: true,
      globDeps: true,
    });
  }

  async compile(source) {
    const {data, path} = source;
    if (!data.trim().length) return Promise.resolve({data: ''}); // skip empty source files

    try {
      // Sync render is >2x faster (without using external deps.) according to
      // dart-sass docs: https://github.com/sass/dart-sass#javascript-api
      const result = sass.renderSync({
        file: source.path,
        data: source.data,
        includePaths: this._getIncludePaths(source.path),
        outputStyle: this.optimize ? 'compressed' : 'expanded',
        indentedSyntax: sassRe.test(source.path),
        outFile: 'a.css',
        functions: this.config.functions,
        sourceMap: true,
        omitSourceMapUrl: true,
        sourceMapRoot: source.path,
        importer: nodeSassGlobImporter(),
      });

      const data = `${result.css.toString()}\n\n`;
      const map = JSON.parse(result.map.toString());

      // Use relative paths to avoid leaking data.
      map.sources = map.sources.map(src => sysPath.relative(
        this.rootPath,
        // Brunch expects this to be a path, and doesn't handle URLs.
        sysPath.sep === '\\' ? src.replace('file:///', '') : src.replace('file://', '')
      ));

      const params = {data, map};
      if (this.modules && !this.isIgnored(path)) {
        const moduleOptions = this.modules === true ? {} : this.modules;
        return cssModulify(path, params.data, params.map, moduleOptions);
      }

      return params;
    } catch (error) {
      throw formatError(source.path, error);
    }
  }
}

SassCompiler.prototype.brunchPlugin = true;
SassCompiler.prototype.type = 'stylesheet';
SassCompiler.prototype.pattern = /\.s[ac]ss$/;

module.exports = SassCompiler;
