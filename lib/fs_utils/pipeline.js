'use strict';
const promisify = require('../promise').promisify;
const debug = require('debug')('brunch:pipeline');
const cachedRead = promisify(require('fcache').readFile);
const logger = require('loggy');
const deppack = promisify(require('deppack'));
const mediator = require('../mediator');

const prepareError = (type, stringOrError) => {
  const string = stringOrError instanceof Error ?
    stringOrError.toString().replace(/^([^:]+:\s+)/, '') :
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
      return promisify(linter.lint)(data, path);
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
        logger.warn("Linting of " + path + ": " + error);
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
      return Promise.reject("Compiler '" + name + "' already passes dependencies. Remove `getDependencies` method.");
    }
    debug("getDependencies '" + path + "' with '" + name + "'");
    return promisify(compiler.getDependencies).call(compiler, data, path);
  } else {
    return Promise.resolve(compilerDeps || []);
  }
};

const compilerChain = (previousPromise, compiler) => {
  return previousPromise.then(params => {
    if (!params) return Promise.resolve();

    const dependencies = params.dependencies;
    let compiled = params.compiled;
    const source = params.source;
    let sourceMap = params.sourceMap;
    const path = params.path;
    debug("Compiling '" + path + "' with '" + compiler.constructor.name + "'");
    const compilerData = compiled || source;
    const compilerArgs = (function () {
      if (compiler.compile.length === 2) {

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

    return promisify(compiler.compile).apply(compiler, compilerArgs)
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
        return Promise.reject(new Error("Brunch SourceFile: file " + path + " data is invalid"));
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
      return Promise.reject(prepareError('Compiling', error))
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
    })
};

const brre = /brunch/;

const isNpm = path => {
  if (!mediator.npmIsEnabled) {
    return false;
  }
  return path.indexOf('node_modules') >= 0 && !brre.test(path);

  /* Brunch modules. */
};

const depOptions = {
  basedir: '.',
  rollback: false,
  ignoreRequireDefinition: true
};

const warningRe = /^warn\:\s/i;

const pipeline = (path, linters, compilers) => {
  if (isNpm(path)) {
    return deppack(path, depOptions)
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
      return Promise.reject(prepareError('Read', error));
    }).then(callLinters)
      .then(callCompilers);
  }
};

exports.pipeline = pipeline;
