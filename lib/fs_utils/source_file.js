'use strict';
const debug = require('debug')('brunch:file');
const readFromCache = require('fcache').readFile;
const logger = require('loggy');
const deppack = require('deppack');
const processFile = require('./pipeline').processFile;
const SourceMapConsumer = require('source-map').SourceMapConsumer;
const SourceNode = require('source-map').SourceNode;
const BrunchError = require('../utils/error');
const helpers = require('../utils/plugins').helpers;

const identityNode = (code, path) => {
  const lines = code.split('\n').map((line, index) => {
    return new SourceNode(index + 1, 0, path, `${line}\n`);
  });

  return new SourceNode(1, 0, null, lines);
};

const prepSourceMap = (code, sourceMap) => {
  const consumer = new SourceMapConsumer(typeof sourceMap === 'string' ?
    JSON.parse(sourceMap) : sourceMap
  );

  return SourceNode.fromStringWithSourceMap(code, consumer);
};

const wrappedNode = (path, wrapped, sourceMap) => {
  const data = wrapped.data;
  const isIdentity = sourceMap == null;
  const node = isIdentity ? identityNode(data, path) : prepSourceMap(data, sourceMap);

  node.isIdentity = isIdentity;
  node.source = path;
  node.setSourceContent(path, data);
  node.prepend(wrapped.prefix);
  node.add(wrapped.suffix);

  return node;
};

const getInitialType = path => {
  if (deppack.isNpmJSON(path) || path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.css')) return 'stylesheet';

  return '';
};

class SourceFile {
  constructor(path, vendorConvention, moduleWrapper, fileList) {
    debug(`Init file ${path}`);

    this.isVendor = vendorConvention(path);
    this._moduleWrapper = moduleWrapper;
    this._exploreDeps = deppack.exploreDeps(fileList);

    this._realPath = this.path = path;
    this.source = '';
    this.removed = this.disposed = false;

    this.error = null;
    this.dependencies = [];
    this.compilationTime = 0;

    // treat json files from node_modules as js
    this.type = getInitialType(path);
    this.targets = {};

    // Disallow adding new properties and changing descriptors.
    Object.seal(this);
  }

  get _shouldBeWrapped() {
    return this.isJS && !this.isVendor;
  }

  get isHelper() {
    return helpers.includes(this.path);
  }

  get isJS() {
    return this.type === 'javascript' || this.type === 'template';
  }

  get isModule() {
    return !(this.isHelper || this.isVendor);
  }

  compile() {
    const path = this.path = this._realPath;
    if (this.disposed) {
      throw new BrunchError('ALREADY_DISPOSED', {path});
    }

    return readFromCache(path)
      .then(data => {
        data += '';
        this.source = data;
        return {path, data};
      })
      .then(processFile)
      .then(file => {
        this.type = this.type || file.type || '';
        file.compiled = file.data;
        return file;
      })
      .then(this._exploreDeps)
      .then(file => {
        file.data = file.compiled;
        return file;
      })
      .then(file => this._updateCache(file))
      .catch(error => {
        this.error = error;
        return this;
      });
  }

  _updateCache(file) {
    this.error = null;
    this.compilationTime = Date.now();
    this.dependencies = file.dependencies || [];

    const data = file.data;

    return this._updateMap(data, file.map).then(node => {
      this.targets = {
        [this.type]: {data, node},
      };

      const cssExports = file.cssExports;
      if (cssExports && this.type !== 'stylesheet') {
        this.targets.stylesheet = {
          data: cssExports,
          node: identityNode(cssExports, this.path),
        };
      }

      const exports = file.exports;
      if (!exports || this.type === 'javascript') return;

      this.targets.javascript = {
        data: exports,
        node: wrappedNode(this.path, this._wrap(exports)),
      };
    });
  }

  _wrap(data) {
    return this._moduleWrapper(this.path, data);
  }

  _checkAndWrap(data) {
    if (this._shouldBeWrapped) return this._wrap(data);

    return {
      data,
      prefix: '',
      suffix: '',
    };
  }

  _updateMap(compiled, sourceMap) {
    const wrapped = this._checkAndWrap(compiled);
    const path = this.path;
    const node = wrappedNode(path, wrapped, sourceMap);

    if (sourceMap) {
      debug(`Generated source map for '${path}'`);
    }

    // the supplied source map might contain more than one source file
    const addSource = path => readFromCache(path).then(content => {
      node.setSourceContent(path, content);
    }).catch(error => {
      logger.error(`Source map generation failed for '${path}': `, error);
    });

    const sources = sourceMap && sourceMap.sources || [];
    return Promise.all(sources.map(addSource)).then(() => node);
  }

  dispose() {
    debug(`Disposing file ${this.path}`);

    this.path = '';
    this.source = '';
    this.disposed = true;
    this.error = null;

    this.targets = Object.freeze({});
    this.dependencies = Object.freeze([]);

    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

module.exports = SourceFile;
