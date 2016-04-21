'use strict';
const debug = require('debug')('brunch:file');
const readFileFromCache = require('micro-promisify')(require('fcache').readFile);

const _smap = require('source-map');
const SourceMapConsumer = _smap.SourceMapConsumer;
const SourceNode = _smap.SourceNode;

const deppack = require('deppack');
const pipeline = require('./pipeline').pipeline;

const _helpers = require('../helpers'); // below
const prettify = _helpers.prettify;
const identityNode = _helpers.identityNode;
const replaceBackSlashes = _helpers.replaceBackSlashes;
const isWindows = _helpers.isWindows;

// SourceFile: (data) -> File
// Abstraction on top of source file (that's read / compiled.)

const sMapRe = /^\)\]\}'/;

const prepareSourceMap = (sourceMap, wrapperContent) => {
  const mapping = typeof sourceMap === 'string' ?
    JSON.parse(sourceMap.replace(sMapRe, '')) : sourceMap;
  if (isWindows && mapping.sources) {
    mapping.sources = mapping.sources.map(replaceBackSlashes);
  }
  const map = new SourceMapConsumer(mapping);
  return SourceNode.fromStringWithSourceMap(wrapperContent, map);
};

const wrappedNode = (path, compiled, wrapped, sourceMap) => {
  const obj = typeof wrapped === 'object';
  const sourcePos = !obj && wrapped.indexOf(compiled);
  const prefix = obj ? wrapped.prefix : wrapped.slice(0, sourcePos);
  const suffix = obj ? wrapped.suffix : wrapped.slice(sourcePos + compiled.length);
  const wrapperContent = obj ?
    (wrapped.data || compiled) :
    (sourcePos > 0 ? compiled : wrapped);
  const node = sourceMap ? prepareSourceMap(sourceMap, wrapperContent) :
    identityNode(wrapperContent, path);
  node.isIdentity = sourceMap == null;
  if (prefix) node.prepend(prefix);
  if (suffix) node.add(suffix);
  node.source = path;
  node.setSourceContent(path, wrapperContent);
  return node;
};

const updateMap = (path, compiled, wrapped, sourceMap) => {
  if (sourceMap) {
    debug("Generated source map for '" + path + "' ");
  }
  const node = wrappedNode(path, compiled, wrapped, sourceMap);

  // the supplied source map might contain more than one source file
  const addSource = path => readFileFromCache(path).then(content => {
    node.setSourceContent(path, content.toString());
  });

  const sources = sourceMap && sourceMap.sources || [];
  return Promise.all(sources.map(addSource)).then(() => node);
};

const updateJsExportsNode = (path, jsExports, wrappedJsExports) => {
  if (jsExports) {
    return wrappedNode(path, jsExports, wrappedJsExports, null);
  }
};

const updateCache = (path, cache, error, result, wrap, jsWrap) => {
  if (error != null) {
    cache.error = error;
    return cache;
  }
  if (result == null) {
    cache.error = null;
    cache.targets = {};
    cache.targets[cache.type] = { data: null, node: null };
    cache.compilationTime = Date.now();
    return cache;
  }
  const source = result.source;
  const compiled = result.compiled;
  const wrapped = wrap(compiled);
  cache.error = null;
  cache.dependencies = result.dependencies;
  cache.source = source;
  cache.compilationTime = Date.now();
  updateMap(path, compiled, wrapped, result.sourceMap).then(node => {
    cache.targets = {};
    cache.targets[cache.type] = { data: compiled, node: node };
    if (result.jsExports && cache.type !== 'javascript') {
      const jsNode = updateJsExportsNode(path, result.jsExports, jsWrap(result.jsExports));
      cache.targets['javascript'] = { data: result.jsExports, node: jsNode, addon: true };
    }
    return cache;
  });
};

const makeWrapper = (wrapper, path, isWrapped, isntModule) => {
  return node => isWrapped ? wrapper(path, node, isntModule) : node;
};

const makeCompiler = (path, cache, linters, compilers, wrap, jsWrap) => {
  const normalizedPath = replaceBackSlashes(path);
  return () => {
    return pipeline(normalizedPath, linters, compilers, cache.fileList)
      .then(data => {
        return updateCache(normalizedPath, cache, null, data, wrap, jsWrap).then(() => null);
      }, error => {
        return updateCache(normalizedPath, cache, error, null, wrap, jsWrap).then(() => Promise.reject(error));
      });
  };
};

// A file that will be compiled by brunch.
class SourceFile {
  constructor(path, compilers, linters, wrapper, isHelper, isVendor, fileList) {
    this.fileList = fileList;
    // treat json files from node_modules as javascript
    const first = compilers && compilers[0];
    const type = first && first.type || deppack.isNpmJSON(path) && 'javascript';
    const isntModule = isHelper || isVendor;
    const isWrapped = type === 'javascript' || type === 'template';
    const wrap = makeWrapper(wrapper, path, isWrapped, isntModule);
    const jsWrap = makeWrapper(wrapper, path, true, isntModule);

    this.path = path;
    this.type = type;
    this.source = '';
    this.targets = {};
    this.dependencies = [];
    this.compilationTime = null;
    this.error = null;
    this.isHelper = isHelper;
    this.isModule = !isntModule;
    this.removed = false;
    this.disposed = false;
    this.compile = makeCompiler(path, this, linters, compilers, wrap, jsWrap);
    debug(`Init ${path}: %s`, prettify({isntModule, isWrapped}));

    Object.seal(this); // Disallow adding new properties.
  }

  dispose() {
    debug(`Disposing ${this.path}`);
    this.path = '';
    this.targets = Object.freeze({});
    this.dependencies = Object.freeze([]);
    this.disposed = true;
    this.error = null;
    this.compile = null;

    // You're frozen when your heart's not open.
    Object.freeze(this);
  }
}

module.exports = SourceFile;
