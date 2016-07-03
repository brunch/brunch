'use strict';
const sysPath = require('../path');
const logger = require('loggy');
const debug = require('debug')('brunch:pipeline');
const promisify = require('micro-promisify');
const readFromCache = promisify(require('fcache').readFile);
const callPlugin = require('../helpers').callPlugin;
const deppack = require('deppack'); // wrapInModule, exploreDeps, isNpm
const processJob = require('../workers').processJob;

// Pipeline: File -> File.
// Takes file and a) lints b) compiles c) extracts dependencies from it.

const errorRe = /^([^:]+:\s+)/;
const prepareError = (type, stringOrError) => {
  const string = stringOrError instanceof Error ?
    stringOrError.toString().replace(errorRe, '') :
    stringOrError;
  const error = new Error(string);
  error.code = type;
  throw error;
};

// Run all linters.
const lint = (data, path, linters) => {
  return linters.reduce((previousPromise, linter) => {
    debug(`Linting '${path}' with '${linter.constructor.name}'`);
    return previousPromise.then(() => {
      return callPlugin(linter, linter.lint, 2, [data, path]);
    });
  }, Promise.resolve()).then(() => data, error => {
    if (/^warn:\s/i.test(error)) {
      logger.warn(`Linting of ${path}: ${error}`);
      return data;
    }
    return prepareError('Linting', error);
  });
};

// Extract files that depend on current file.
const getDependencies = (data, path, compilerDeps, compiler) => {
  if (compiler.getDependencies) {
    const name = compiler.constructor.name;
    if (compilerDeps) {
      return Promise.reject(
        `Compiler '${name}' already passes dependencies. ` +
        'Remove "getDependencies" method.');
    }
    debug(`Dependencies ${path} @ ${name}`);
    return callPlugin(compiler, compiler.getDependencies, 2, [data, path])
      .then(deps => {
        return deps.map(x => sysPath.normalize(x));
      });
  }
  return Promise.resolve(compilerDeps || []);
};

const compileStatic = (path, plugin) => {
  return readFromCache(path).then(source => {
    return processJob(CompileStaticJob, {path, source, plugin}).then(data => {
      return Object.assign({}, data, {source});
    });
  });
};

const _compileStatic = (path, source, compiler) => {
  let compilationTime, compiled;
  debug(`Compiling static ${path} @ ${compiler.constructor.name}`);
  return compiler.compileStatic({path, data: source}).then(_compiled => {
    compilationTime = Date.now();
    compiled = _compiled && typeof _compiled === 'object' ? _compiled.data : _compiled;
    if (compiler.getDependencies) {
      return callPlugin(compiler, compiler.getDependencies, 2, [source, path])
        .catch(error => prepareError('Dependency parsing', error));
    }
    return [];
  }).then(dependencies => {
    return {compiled, compilationTime, dependencies};
  }, error => prepareError('Compiling', error));
};

const compilerChain = (previousPromise, compiler) => {
  return previousPromise.then(params => {
    if (!params) return;

    // const dependencies = params.dependencies;
    const compiled = params.compiled;
    const source = params.source;
    let sourceMap = params.sourceMap;
    const path = params.path;
    debug(`Compiling ${path} @ ${compiler.constructor.name}`);
    const compilerData = compiled || source;
    const fn = compiler.compile;

    // New API: compile({data, path}, callback)
    // Old API: compile(data, path, callback)
    const compilerArgs = fn.length === 2 || fn.length === 1 ?
      [{data: compilerData, path, map: sourceMap}] :
      [compilerData, path];
    return callPlugin(compiler, fn, 1, compilerArgs, `compile ${path}`)
      .then(result => {
        if (result == null) return;
        const isObject = toString.call(result) === '[object Object]';
        const compiled = isObject ? result.data : result;
        const compilerDeps = isObject && result.dependencies;
        const jsExports = isObject && result.exports;
        if (isObject) sourceMap = result.map;
        if (compiled == null) {
          throw new Error(`Brunch SourceFile: file ${path} data is invalid`);
        }
        return getDependencies(source, path, compilerDeps, compiler)
        .then(dependencies => {
          return {dependencies, compiled, source, sourceMap, path, jsExports};
        }, error => prepareError('Dependency parsing', error));
      }, error => prepareError('Compiling', error));
  });
};

const compile = (source, path, compilers) => {
  const params = {source, path};
  return Promise.resolve(compilers).then(compilers => {
    return compilers.reduce(compilerChain, Promise.resolve(params));
  });
};

const CompileJob = {
  path: 'CompileJob',

  serialize(hash) {
    return {path: hash.path, source: hash.source};
  },

  deserialize(ctx, hash) {
    const isPluginFor = require('../plugins').isPluginFor;
    const linters = ctx.plugins.linters.filter(isPluginFor(hash.path));
    const compilers = ctx.plugins.compilers.filter(isPluginFor(hash.path));

    return {path: hash.path, source: hash.source, linters, compilers};
  },

  work(hash) {
    const path = hash.path;
    const source = hash.source;
    const linters = hash.linters;
    const compilers = hash.compilers;

    const callLinters = source => {
      return lint(source, path, linters);
    };

    const callCompilers = source => {
      return compile(source, path, compilers);
    };

    return Promise.resolve(source).then(callLinters).then(callCompilers);
  }
};

const CompileStaticJob = {
  path: 'CompileStaticJob',

  serialize(hash) {
    return {path: hash.path, source: hash.source, pluginName: hash.plugin.brunchPluginName};
  },

  deserialize(ctx, hash) {
    const plugin = ctx.staticCompilers.find(p => p.brunchPluginName === hash.pluginName);
    return {path: hash.path, source: hash.source, plugin};
  },

  work(hash) {
    const path = hash.path;
    const source = hash.source;
    const compiler = hash.plugin;

    return _compileStatic(path, source, compiler);
  }
};

exports.pipeline = (path, linters, compilers, fileList, depCompilers) => {
  if (deppack.isNpm(path)) {
    const _path = sysPath.resolve('.', path);
    const selectedLinters = [];
    const selectedCompilers = depCompilers.length ? compilers.filter(compiler => {
      const name = compiler.brunchPluginName;
      return name === 'javascript-brunch' || depCompilers.includes(name);
    }) : [];

    return readFromCache(path).catch(error => prepareError('Read', error))
      .then(source => {
        if (selectedCompilers.length) {
          return processJob(CompileJob, {path, source, linters: selectedLinters, compilers: selectedCompilers});
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
    .catch(error => prepareError('Read', error))
    .then(source => processJob(CompileJob, {path, source, linters, compilers}))
    .then(deppack.exploreDeps(fileList));
};

exports.CompileJob = CompileJob;
exports.CompileStaticJob = CompileStaticJob;
exports.compileStatic = compileStatic;
