'use strict';
const each = require('async-each');
const waterfall = require('async-waterfall');
const debug = require('debug')('brunch:pipeline');
const fcache = require('fcache');
const logger = require('loggy');
const deppack = require('deppack');
const mediator = require('../mediator');

const throwError = (type, stringOrError) => {
  var error, string;
  string = stringOrError instanceof Error ? stringOrError.toString().replace(/^([^:]+:\s+)/, '') : stringOrError;
  error = new Error(string);
  error.code = type;
  return error;
};


/* Run all linters. */

const lint = (data, path, linters, callback) => {
  if (linters.length === 0) {
    callback(null);
  } else {
    each(linters, (linter, cb) => {
      debug("Linting '" + path + "' with '" + linter.constructor.name + "'");
      linter.lint(data, path, cb);
    }, callback);
  }
};


/* Extract files that depend on current file. */

const getDependencies = (data, path, compilerDeps, compiler, callback) => {
  if (compiler.getDependencies) {
    const name = compiler.constructor.name;
    if (compilerDeps) {
      return callback("Compiler '" + name + "' already passes dependencies. Remove `getDependencies` method.");
    }
    debug("getDependencies '" + path + "' with '" + name + "'");
    compiler.getDependencies(data, path, callback);
  } else {
    callback(null, compilerDeps || []);
  }
};

const mapCompilerChain = compiler => {
  return (params, next) => {
    var callback, compiled, compilerArgs, compilerData, dependencies, path, source, sourceMap;
    if (!params) {
      return next();
    }
    dependencies = params.dependencies, compiled = params.compiled, source = params.source, sourceMap = params.sourceMap, path = params.path, callback = params.callback;
    debug("Compiling '" + path + "' with '" + compiler.constructor.name + "'");
    compilerData = compiled || source;
    compilerArgs = (function() {
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
    compilerArgs.push((error, result) => {
      let compilerDeps;
      if (error != null) {
        return callback(throwError('Compiling', error));
      }
      if (result == null) {
        return next();
      }
      if (toString.call(result) === '[object Object]') {
        compiled = result.data;
        sourceMap = result.map;
        compilerDeps = result.dependencies;
      } else {
        compiled = result;
      }
      if (compiled == null) {
        throw new Error("Brunch SourceFile: file " + path + " data is invalid");
      }
      return getDependencies(source, path, compilerDeps, compiler, (error, dependencies) => {
        if (error != null) {
          return callback(throwError('Dependency parsing', error));
        }
        return next(null, {
          dependencies: dependencies,
          compiled: compiled,
          source: source,
          sourceMap: sourceMap,
          path: path,
          callback: callback
        });
      });
    });
    return compiler.compile.apply(compiler, compilerArgs);
  };
};

const compile = (source, path, compilers, callback) => {
  const first = next => {
    return next(null, {
      source: source,
      path: path,
      callback: callback
    });
  };
  return waterfall([first].concat(compilers.map(mapCompilerChain)), callback);
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

const pipeline = (path, linters, compilers, callback) => {
  if (isNpm(path)) {
    return deppack(path, depOptions, (error, source) => {

      /* compile source, path, compilers, callback */
      return callback(null, {
        compiled: source,
        source: source,
        path: path
      });
    });
  } else {
    return fcache.readFile(path, (error, source) => {
      if (error != null) {
        return callback(throwError('Read', error));
      }
      lint(source, path, linters, error => {
        if (error != null) {
          if (error.toString().match(warningRe)) {
            logger.warn("Linting of " + path + ": " + error);
          } else {
            return callback(throwError('Linting', error));
          }
        }
        compile(source, path, compilers, callback);
      });
    });
  }
};

exports.pipeline = pipeline;
