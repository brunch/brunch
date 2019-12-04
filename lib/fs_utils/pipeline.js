'use strict';
const sysPath = require('universal-path');
const logger = require('loggy');
const debug = require('debug')('brunch:pipeline');
const deppack = require('deppack'); // isNpm
const BrunchError = require('../utils/error');

// Pipeline: File -> File.
// Takes file and a) lints b) compiles c) extracts dependencies from it.

const extRe = /(\.\w+)+$/;

let plugins = [];
let npmCompilers = [];
function respondTo(key) {
  return plugins.filter(plugin => {
    return typeof plugin[key] === 'function';
  });
}

function setPlugins(_plugins, _npmCompilers) {
  plugins = _plugins.all;
  npmCompilers = _npmCompilers;
  deppack.setPlugins(_plugins, npmCompilers);
}

function pull(array, predicate) {
  const index = array.findIndex(predicate);
  if (index === -1) return;

  const item = array[index];
  array.splice(index, 1);
  return item;
}

function rethrow(message) {
  return error => {
    if (!(error instanceof Error)) {
      error = new Error(error);
    }

    error.pipelineCode = message;
    throw error;
  };
}

async function lint(file) {
  const path = file.path;
  const linters = respondTo('lint').filter(l => l.pattern.test(path)).map(linter => {
    debug(`Linting ${path} @ ${linter.brunchPluginName}`);
    return linter.lint(file);
  });

  try {
    await Promise.all(linters);
  } catch (error) {
    if (/^warn:\s/i.test(error)) {
      logger.warn(`Linting of ${path}: ${error}`);
    } else {
      rethrow('Linting')(error);
    }
  }
  return file;
}

async function compileStatic(file, compiler) {
  const path = file.path;
  debug(`Compiling asset ${path} @ ${compiler.brunchPluginName}`);

  try {
    const compiled = await compiler.compileStatic(file);
    if (compiled == null) return file;
    if (compiled.data == null) {
      throw new BrunchError('FILE_DATA_INVALID', {path});
    }

    const dependencies = Array.isArray(compiled.dependencies) ?
      compiled.dependencies :
      await getDependencies(file, compiler);

    const cpath = compiled.path || file.path;
    return Object.assign({}, compiled, {
      dependencies,
      path: compiler.staticTargetExtension ?
        cpath.replace(extRe, compiler.staticTargetExtension) :
        cpath,
    });
  } catch (error) {
    rethrow('Compiling asset')(error);
  }
};

// Extract files' paths that depend on current file.
async function getDependencies(file, compiler) {
  if (typeof compiler.getDependencies !== 'function') {
    return Promise.resolve();
  }

  debug(`Fetching dependencies ${file.path} @ ${compiler.brunchPluginName}`);
  try {
    const deps = compiler.getDependencies(file);
    return deps.concat(deps.patterns || []).map(sysPath.normalize);
  } catch (error) {
    rethrow('Dependency parsing')(error);
  }
}

async function compile(file, compiler) {
  const path = file.path;
  debug(`Compiling ${path} @ ${compiler.brunchPluginName}`);

  try {
    const compiled = await compiler.compile(file);
    if (compiled == null) return file;
    if (compiled.data == null) {
      throw new BrunchError('FILE_DATA_INVALID', {path});
    }

    const dependencies = Array.isArray(compiled.dependencies) ?
      compiled.dependencies :
      await getDependencies(file, compiler);

    const cpath = compiled.path || file.path;
    return Object.assign({}, compiled, {
      dependencies: (file.dependencies || []).concat(dependencies || []),
      type: compiler.type,
      path: compiler.targetExtension ?
        cpath.replace(extRe, compiler.targetExtension) :
        cpath,
    });
  } catch (error) {
    rethrow('Compiling')(error);
  }
}

/**
 * @returns {Promise<File>}
 */
async function nextCompiler(compilers, isStatic, file) {
  const prop = isStatic ? 'staticPattern' : 'pattern';
  const exec = isStatic ? compileStatic : compile;
  const compiler = pull(compilers, comp => comp[prop].test(file.path));
  if (!compiler) return file;
  const compiled = await exec(file, compiler);
  return nextCompiler(compilers, isStatic, compiled);
}

async function processAsset(file) {
  const compilers = respondTo('compileStatic').filter(comp => comp.type === 'template');
  return nextCompiler(compilers, true, file);
}

async function processFile(file) {
  const {path} = file;
  const isNpm = deppack.isNpm(path);

  const usePlugin = isNpm ?
    compiler => npmCompilers.includes(compiler.brunchPluginName) :
    () => true;

  const lintedFile = await lint(file);
  const compilers = respondTo('compile').filter(usePlugin);
  const processed = await nextCompiler(compilers, false, lintedFile);
  if (!isNpm) return processed;

  const wrapped = await deppack.wrapSourceInModule(processed.data, sysPath.resolve(path));
  processed.data = wrapped;
  return processed;
}

module.exports = {processAsset, processFile, setPlugins};
