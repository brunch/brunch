'use strict';
const logger = require('loggy');
const debug = require('debug')('brunch:pipeline');
const helpers = require('../helpers');
const promisify = helpers.promisify;
const cachedRead = promisify(require('fcache').readFile);
const deppack = require('../deppack');
const mediator = require('../mediator');
const promisifyPlugin = helpers.promisifyPlugin;

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


/* Run all linters. */

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
        logger.warn('Linting of ' + path + ': ' + error);
        return Promise.resolve(data);
      } else {
        return Promise.reject(prepareError('Linting', error));
      }
    });
};


/* Extract files that depend on current file. */

const getDependencies = (data, path, compilerDeps, compiler) => {
  if (compiler.getDependencies) {
    const name = compiler.constructor.name;
    if (compilerDeps) {
      return Promise.reject(
        `Compiler '${name}' already passes dependencies. ` +
        `Remove 'getDependencies' method.`);
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
    const compilerArgs = (() => {
      if (compiler.compile.length === 2 || compiler.compile.length === 1) {

        /* New API: compile({data, path}, callback) */
        return [
          {
            data: compilerData,
            path: path,
            map: sourceMap
          }
        ];
      } else {

        /* Old API: compile(data, path, callback) */
        return [compilerData, path];
      }
    })();

    return promisifyPlugin(1, compiler.compile).apply(compiler, compilerArgs)
      .then(result => {
        if (result == null) {
          return Promise.resolve();
        }
        let compiled;
        let compilerDeps;
        if (toString.call(result) === '[object Object]') {
          compiled = result.data;
          sourceMap = result.map;
          compilerDeps = result.dependencies;
        } else {
          compiled = result;
        }
        if (compiled == null) {
          return Promise.reject(
            new Error(`Brunch SourceFile: file ${path} data is invalid`)
          );
        }
        return getDependencies(source, path, compilerDeps, compiler)
        .then(dependencies => {
          return Promise.resolve({
            dependencies: dependencies,
            compiled: compiled,
            source: source,
            sourceMap: sourceMap,
            path: path
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
  const params = {
    source: source,
    path: path
  };
  return Promise.resolve(compilers)
    .then(compilers => {
      return compilers.reduce(compilerChain, Promise.resolve(params));
    });
};

const brre = /brunch/;

const isNpm = path => {
  if (!mediator.npmIsEnabled) return false;
  return path.indexOf('node_modules') >= 0 &&
    !brre.test(path) && path.indexOf('.css') === -1;

  /* Brunch modules. */
};

const depOptions = {
  basedir: '.',
  rollback: false,
  ignoreRequireDefinition: true
};

const warningRe = /^warn\:\s/i;

exports.pipeline = (path, linters, compilers) => {
  if (isNpm(path)) {
    return deppack.loadFile(path, depOptions)
      .then(source => {
        return {
          compiled: source,
          source: source,
          path: path
        };
      });
  } else {
    const callLinters = (source) => {
      return lint(source, path, linters);
    };

    const callCompilers = (source) => {
      return compile(source, path, compilers);
    };

    return cachedRead(path).then(path => {
      return Promise.resolve(path);
    }, (err) => {
      return Promise.reject(prepareError('Read', err));
    }).then(callLinters)
      .then(callCompilers);
  }
};
