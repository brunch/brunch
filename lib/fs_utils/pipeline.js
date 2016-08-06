'use strict';
const sysPath = require('../path');
const logger = require('loggy');
const debug = require('debug')('brunch:pipeline');
const readFromCache = require('fcache').readFile;
const callPlugin = require('../helpers').callPlugin;
const promiseReduce = require('../helpers').promiseReduce;
const deppack = require('deppack'); // wrapInModule, exploreDeps, isNpm
const processJob = require('../workers').processJob;
const isPluginFor = require('../plugins').isPluginFor;
const BrunchError = require('../error');
const rethrow = BrunchError.rethrow;

// Pipeline: File -> File.
// Takes file and a) lints b) compiles c) extracts dependencies from it.

// Run all linters.
const lint = (file, linters) => {
  return promiseReduce(linters, linter => {
    debug(`Linting ${file.path} @ ${linter.constructor.name}`);
    return () => callPlugin(linter, 'lint', file);
  }).catch(error => {
    if (/^warn:\s/i.test(error)) {
      logger.warn(`Linting of ${file.path}: ${error}`);
    } else {
      throw new BrunchError('Linting', {error});
    }
  });
};

// Extract files that depend on current file.
const getDependencies = (file, compiler) => {
  if (typeof compiler.getDependencies !== 'function') {
    return Promise.resolve([]);
  }

  const name = compiler.constructor.name;
  debug(`Fetching dependencies ${file.path} @ ${name}`);
  return callPlugin(compiler, 'getDependencies', file)
    .then(deps => {
      return deps.map(sysPath.normalize).concat(deps.patterns || []);
    })
    .catch(rethrow('Dependency parsing'));
};

const compileStatic = (path, compiler) => {
  return readFromCache(path).then(data => {
    return processJob(CompileStaticJob, {data, path, compiler});
  });
};

const _compileStatic = (file, compiler) => {
  debug(`Compiling static ${file.path} @ ${compiler.constructor.name}`);
  return callPlugin(compiler, 'compileStatic', file).then(result => {
    const compilationTime = Date.now();
    const compiled = result && typeof result === 'object' ?
      result.data :
      result;

    return getDependencies(file, compiler).then(dependencies => {
      return {source: file.data, compilationTime, compiled, dependencies};
    });
  }).catch(rethrow('Compiling'));
};

const compile = compiler => params => {
  if (!params) return;

  const source = params.source || params.data;
  const path = params.path;
  const name = compiler.constructor.name;
  debug(`Compiling ${path} @ ${name}`);

  const file = {
    data: params.compiled || source,
    path,
    map: params.sourceMap
  };

  return callPlugin(compiler, 'compile', file).then(result => {
    if (result == null) return;
    const isObj = typeof result === 'object';
    const compiled = isObj ? result.data : result;
    if (compiled == null) {
      throw new BrunchError('FILE_DATA_INVALID', {path});
    }

    const compilerDeps = isObj && result.dependencies;
    if (compilerDeps && typeof compiler.getDependencies === 'function') {
      throw new BrunchError('REMOVE_GET_DEPS', {name});
    }

    const jsExports = isObj && result.exports;
    const sourceMap = isObj ? result.map : params.sourceMap;

    return getDependencies({data: source, path}, compiler)
      .then(dependencies => {
        return {dependencies, compiled, source, sourceMap, path, jsExports};
      });
  }).catch(rethrow('Compiling'));
};

const CompileJob = {
  path: 'CompileJob',

  serialize(hash) {
    return {path: hash.path, source: hash.source};
  },

  deserialize(ctx, hash) {
    const path = hash.path;
    const isFor = isPluginFor(path);

    const linters = ctx.plugins.linters.filter(isFor);
    const compilers = ctx.plugins.compilers.filter(isFor);

    return {path, source: hash.source, linters, compilers};
  },

  work(hash) {
    const file = {data: hash.source, path: hash.path};

    return lint(file, hash.linters).then(() => {
      return promiseReduce(hash.compilers, compile, file);
    });
  }
};

const CompileStaticJob = {
  path: 'CompileStaticJob',

  serialize(hash) {
    const compilerName = hash.compiler.brunchPluginName;
    return {data: hash.data, path: hash.path, compilerName};
  },

  deserialize(ctx, hash) {
    const compiler = ctx.staticCompilers.find(compiler => {
      return compiler.brunchPluginName === hash.compilerName;
    });
    return {data: hash.data, path: hash.path, compiler};
  },

  work(hash) {
    const file = {data: hash.data, path: hash.path};
    return _compileStatic(file, hash.compiler);
  }
};

const pipeline = (path, linters, compilers, fileList, depCompilers) => {
  if (deppack.isNpm(path)) {
    const _path = sysPath.resolve('.', path);
    const selectedCompilers = depCompilers.length ? compilers.filter(compiler => {
      const name = compiler.brunchPluginName;
      return name === 'javascript-brunch' || depCompilers.includes(name);
    }) : [];

    return readFromCache(path).catch(rethrow('Reading'))
      .then(source => {
        if (selectedCompilers.length) {
          return processJob(CompileJob, {path, source, linters: [], compilers: selectedCompilers});
        }
        return {compiled: source, source, path};
      }).then(file => {
        return deppack.wrapSourceInModule(file.compiled, _path).then(compiled => {
          file.compiled = compiled;
          return file;
        });
      }).then(file => {
        return {compiled: file.compiled, source: file.source, path};
      }).then(deppack.exploreDeps(fileList));
  }

  return readFromCache(path)
    .catch(rethrow('Reading'))
    .then(source => processJob(CompileJob, {path, source, linters, compilers}))
    .then(deppack.exploreDeps(fileList));
};

module.exports = {
  pipeline,
  CompileJob,
  CompileStaticJob,
  compileStatic
};
