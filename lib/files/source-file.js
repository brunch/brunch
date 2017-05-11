'use strict';
const logger = require('loggy');
const BrunchError = require('./error');
const {processFile} = require('./pipeline');
const {SourceNode, SourceMapConsumer} = require('source-map');
const {readonly, fs} = require('./helpers');

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
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.css')) return 'stylesheet';

  return '';
};

module.exports = class SourceFile {
  constructor(path) {
    readonly(this, {path});

    this._source = '';
    this._targets = {};
    this._disposed = false;

    this.type = getInitialType(path);
    this.dependencies = [];

    Object.seal(this);
  }

  get isAsset() {
    return false;
  }

  makeDirty() {
    this._source = '';
  }

  compile() {
    const {path} = this;
    if (this._disposed) throw new BrunchError('ALREADY_DISPOSED', {path});

    const read = Promise.resolve(this._source || fs.readFile(path, 'utf-8'));

    return read.then(data => {
      this._source = data;
      return {path, data};
    })
    .then(processFile)
    .then(file => {
      this.type = this.type || file.type || '';
      return this._updateCache(file);
    })
  }

  _updateCache(file) {
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
        node: wrappedNode(this.path, exports),
      };
    });
  }

  _updateMap(compiled, sourceMap) {
    const wrapped = this.wrap(compiled);
    const {path} = this;
    const node = wrappedNode(path, wrapped, sourceMap);

    // the supplied source map might contain more than one source file
    const addSource = path => readFile(path).then(content => {
      node.setSourceContent(path, content);
    });

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

    this._source = '';
    this._targets = Object.freeze({});
    this._disposed = true;

    this.dependencies = Object.freeze([]);

    Object.freeze(this);
  }
};
