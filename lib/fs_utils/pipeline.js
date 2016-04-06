'use strict';
const logger = require('loggy');
const debug = require('debug')('brunch:pipeline');
const promisify = require('micro-promisify');
const readFromCache = promisify(require('fcache').readFile);
const promisifyPlugin = require('../helpers').promisifyPlugin;
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
  return error;
};


// Run all linters.
const lint = (data, path, linters) => {
  const reduceLinter = (previousPromise, linter) => {
    debug(`Linting '${path}' with '${linter.constructor.name}'`);
    return previousPromise.then(() => {
      return promisifyPlugin(2, linter.lint).call(linter, data, path);
    }, err => {
      return Promise.reject(err);
    });
  };

  return Promise.resolve(linters)
    .then(linters => {
      return linters.reduce(reduceLinter, Promise.resolve());
    }).then(() => {
      return Promise.resolve(data);
    }, error => {
      if (error.toString().match(warningRe)) {
        logger.warn(`Linting of ${path}: ${error}`);
        return Promise.resolve(data);
      } else {
        return Promise.reject(prepareError('Linting', error));
      }
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
    return promisifyPlugin(2, compiler.getDependencies).call(compiler, data, path);
  } else {
    return Promise.resolve(compilerDeps || []);
  }
};

const compilerChain = (previousPromise, compiler) => {
  return previousPromise.then(params => {
    if (!params) return Promise.resolve();

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
    const compilerArgs = (fn.length === 2 || fn.length === 1) ?
      [{data: compilerData, path: path, map: sourceMap}] :
      [compilerData, path];
    return promisifyPlugin(1, fn).apply(compiler, compilerArgs)
      .then(result => {
        if (result == null) return Promise.resolve();
        const isObject = toString.call(result) === '[object Object]';
        const compiled = isObject ? result.data : result;
        const compilerDeps = isObject && result.dependencies;
        const jsExports = isObject && result.exports;
        if (isObject) sourceMap = result.map;
        if (compiled == null) {
          return Promise.reject(new Error(
            `Brunch SourceFile: file ${path} data is invalid`
          ));
        }
        return getDependencies(source, path, compilerDeps, compiler)
        .then(dependencies => {
          return Promise.resolve({
            dependencies, compiled, source, sourceMap, path, jsExports
          });
        }, error => {
          return Promise.reject(prepareError('Dependency parsing', error));
        });
      }, error => {
        return Promise.reject(prepareError('Compiling', error));
      });
  }, err => {
    return Promise.reject(err);
  });
};

const compile = (source, path, compilers) => {
  const params = {source, path};
  return Promise.resolve(compilers).then(compilers => {
    return compilers.reduce(compilerChain, Promise.resolve(params));
  });
};

const warningRe = /^warn\:\s/i;

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

    const callLinters = (source) => {
      return lint(source, path, linters);
    };

    const callCompilers = (source) => {
      return compile(source, path, compilers);
    };

    return Promise.resolve(source).then(callLinters).then(callCompilers);
  }
};

exports.pipeline = (path, linters, compilers, fileList) => {
  if (deppack.isNpm(path)) {
    return deppack.wrapInModule(path).then(source => {
      return {compiled: source, source, path};
    }).then(deppack.exploreDeps(fileList));
  } else {
    return readFromCache(path).then(path => {
      return Promise.resolve(path);
    }, (err) => {
      return Promise.reject(prepareError('Read', err));
    }).then(source => processJob(CompileJob, {path, source, linters, compilers}))
      .then(deppack.exploreDeps(fileList));
  }
};

exports.CompileJob = CompileJob;
