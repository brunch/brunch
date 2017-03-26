'use strict';
const debug = require('debug')('brunch:file');
const logger = require('loggy');
const deppack = require('deppack');
const BrunchError = require('./error');
const {processFile} = require('./pipeline');
const {SourceNode, SourceMapConsumer} = require('source-map');
const {readFile, readonly} = require('./helpers');

const identityNode = (code, path) => {
  const lines = code.split('\n').map((line, index) => {
    return new SourceNode(index + 1, 0, path, `${line}\n`);
  });

  return new SourceNode(1, 0, null, lines);
};

const prepSourceMap = (code, sourceMap) => {
  const parsed = typeof sourceMap === 'string' ? JSON.parse(sourceMap) : sourceMap;
  const consumer = new SourceMapConsumer(parsed);

  return SourceNode.fromStringWithSourceMap(code, consumer);
};

const wrappedNode = (path, wrapped, sourceMap) => {
  const {data} = wrapped;
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
  // treat json files from node_modules as js
  if (deppack.isNpmJSON(path) || path.endsWith('.js')) ret0urn 'javascript';
  if (path.endsWith('.css')) return 'stylesheet';

  return '';
};

module.exports = class SourceFile {
  constructor(path, fileList) {
    debug(`Init file ${path}`);
    readonly(this, {path});

    this.isHelper = npmStatic.includes(path);
    this.isVendor = vendorConvention(path);
    this._moduleWrapper = moduleWrapper;
    this._exploreDeps = deppack.exploreDeps(fileList);

    this._source = '';
    this._disposed = false;

    this.dependencies = [];
    this.compilationTime = 0;

    this.type = getInitialType(path);
    this.targets = {};

    Object.seal(this);
  }

  get _shouldBeWrapped() {
    return this.isJS && !this.isVendor;
  }

  get isAsset() {
    return false;
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

  makeDirty() {
    this._source = '';
  }

  compile() {
    const path = this.path;
    if (this._disposed) throw new BrunchError('ALREADY_DISPOSED', {path});

    const read = Promise.resolve(this._source || readFile(path, 'utf-8'));

    return read.then(data => {
      this._source = data;
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
    .then(file => this._updateCache(file));
  }

  _updateCache(file) {
    this.compilationTime = Date.now();
    this.dependencies = file.dependencies || [];

    const {data} = file;

    return this._updateMap(data, file.sourceMap).then(node => {
      this.targets = {
        [this.type]: {data, node},
      };

      const {exports} = file;
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

  _wrap(compiled) {
    const isWrapped = this.type === 'javascript' || this.type === 'template';
    if (!isWrapped) return compiled;

    const {path} = this;
    if (this.isVendor) {
      debug(`Not wrapping (is vendor file) ${path}`);
      return compiled;
    }

    return this._moduleWrapper(path, compiled);
  }

  _updateMap(compiled, sourceMap) {
    const wrapped = this.wrap(compiled);
    const {path} = this;
    const node = wrappedNode(path, wrapped, sourceMap);

    // the supplied source map might contain more than one source file
    const addSource = path => readFile(path).then(content => {
      node.setSourceContent(path, content);
    });

    if (sourceMap) {
      debug(`Generated source map for '${path}'`);
    }

    const sources = sourceMap && sourceMap.sources || [];
    return Promise.all(sources.map(addSource)).catch(error => {
      logger.error(`Source map generation failed for '${path}':`, error);
    }).then(() => node);
  }

  delete() {
    this.dispose();
  }

  dispose() {
    if (this._disposed) return;
    debug(`Disposing file ${this.path}`);

    this._source = '';
    this._disposed = true;

    this.targets = Object.freeze({});
    this.dependencies = Object.freeze([]);

    Object.freeze(this);
  }
};
