'use strict';
const debug = require('debug')('brunch:source-file');
const pipeline = require('./pipeline').pipeline;
const helpers = require('../helpers');
const smap = require('source-map');

const identityNode = helpers.identityNode;
const replaceBackSlashes = helpers.replaceBackSlashes;
const isWindows = helpers.isWindows;

const SourceMapConsumer = smap.SourceMapConsumer;
const SourceMapGenerator = smap.SourceMapGenerator;
const SourceNode = smap.SourceNode;

const updateMap = (path, compiled, wrapped, sourceMap) => {
  var map, mapping, node, prefix, sourcePos, suffix, wrapperContent;
  if (sourceMap) {
    debug("Generated source map for '" + path + "' ");
  }
  if (typeof wrapped === 'object') {
    prefix = wrapped.prefix, suffix = wrapped.suffix;
    wrapperContent = wrapped.data || compiled;
  } else {
    sourcePos = wrapped.indexOf(compiled);
    wrapperContent = sourcePos > 0 ? compiled : wrapped;
    prefix = wrapped.slice(0, sourcePos);
    suffix = wrapped.slice(sourcePos + compiled.length);
  }
  node = sourceMap ? (mapping = typeof sourceMap === 'string' ? JSON.parse(sourceMap.replace(/^\)\]\}'/, '')) : sourceMap, isWindows && mapping.sources ? mapping.sources = mapping.sources.map(replaceBackSlashes) : undefined, map = new SourceMapConsumer(mapping), SourceNode.fromStringWithSourceMap(wrapperContent, map)) : identityNode(wrapperContent, path);
  node.isIdentity = sourceMap == null;
  if (prefix) node.prepend(prefix);
  if (suffix) node.add(suffix);
  node.source = path;
  node.setSourceContent(path, wrapperContent);
  return node;
};

const updateCache = (path, cache, error, result, wrap) => {
  if (error != null) {
    cache.error = error;
    return cache;
  }
  if (result == null) {
    cache.error = null;
    cache.data = null;
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
  cache.data = compiled;
  cache.node = updateMap(path, compiled, wrapped, result.sourceMap);
  return cache;
};

const makeWrapper = (wrapper, path, isWrapped, isntModule) => {
  return node => {
    if (isWrapped) {
      return wrapper(path, node, isntModule);
    } else {
      return node;
    }
  };
};

const makeCompiler = (path, cache, linters, compilers, wrap) => {
  const normalizedPath = replaceBackSlashes(path);
  return callback => {
    pipeline(path, linters, compilers, (error, data) => {
      updateCache(normalizedPath, cache, error, data, wrap);
      return callback(error, cache.data);
    });
  };
};


/* A file that will be compiled by brunch. */
class SourceFile {
  constructor(path1, compilers, linters, wrapper, isHelper, isVendor) {
    this.path = path1;
    this.isHelper = isHelper;
    const compiler = compilers[0];
    const type = compiler.type;
    const isntModule = this.isHelper || isVendor;
    const isWrapped = type === 'javascript' || type === 'template';
    this.type = type;
    this.source = null;
    this.data = '';
    this.node = null;
    this.dependencies = [];
    this.compilationTime = null;
    this.error = null;
    this.removed = false;
    this.disposed = false;
    const wrap = makeWrapper(wrapper, this.path, isWrapped, isntModule);
    this.compile = makeCompiler(this.path, this, linters, compilers, wrap);
    debug("Initializing fs_utils.SourceFile: %s", JSON.stringify({
      path: this.path,
      isntModule: isntModule,
      isWrapped: isWrapped
    }));
    Object.seal(this);
  }

  dispose() {
    debug("Disposing '" + this.path + "'");
    this.path = '';
    this.data = '';
    this.dependencies = [];
    this.disposed = true;
    return Object.freeze(this);
  }
}

module.exports = SourceFile
