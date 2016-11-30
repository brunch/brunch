'use strict';
const debug = require('debug')('brunch:file');
const readFromCache = require('fcache').readFile;
const logger = require('loggy');
const deppack = require('deppack');
const processFile = require('./pipeline').processFile;
const SourceMapConsumer = require('source-map').SourceMapConsumer;
const SourceNode = require('source-map').SourceNode;
const BrunchError = require('../utils/error');

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

class SourceFile {
  constructor(path, npmStatic, vendorConvention, moduleWrapper, fileList) {
    debug(`Init file ${path}`);

    this.isHelper = npmStatic.includes(path);
    this.isVendor = vendorConvention(path);
    this.moduleWrapper = moduleWrapper;
    this.fileList = fileList;

    this.path = path;
    this.source = '';
    this.removed = this.disposed = false;

    this.error = null;
    this.dependencies = [];
    this.compilationTime = 0;

    // treat json files from node_modules as js
    this.type = deppack.isNpmJSON(path) ? 'javascript' : '';
    this.targets = {};

    // Disallow adding new properties and changing descriptors.
    Object.seal(this);
  }

  get isModule() {
    return !(this.isHelper || this.isVendor);
  }

  compile() {
    const path = this.path;
    if (this.disposed) {
      throw new BrunchError('ALREADY_DISPOSED', {path});
    }

    return readFromCache(path)
      .then(data => {
        this.source = data;
        return {path, data};
      })
      .then(processFile)
      .then(deppack.exploreDeps(this.fileList))
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

    const data = file.compiled;

    return this._updateMap(data, file.sourceMap).then(node => {
      this.targets = {
        [this.type]: {data, node},
      };

      const exports = file.exports;
      if (!exports || this.type === 'javascript') return;

      this.targets.javascript = {
        data: exports,
        node: wrappedNode(this.path, this._wrap(exports)),
      };
    });
  }

  _wrap(compiled) {
    const isWrapped = this.type === 'javascript' || this.type === 'template';
    if (!isWrapped) return compiled;

    const path = this.path;
    if (this.isVendor) {
      debug(`Not wrapping (is vendor file) ${path}`);
      return compiled;
    }

    return this.moduleWrapper(path, compiled);
  }

  _updateMap(compiled, sourceMap) {
    const wrapped = this._wrap(compiled);
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
