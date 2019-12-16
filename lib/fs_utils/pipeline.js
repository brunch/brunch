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
  return plugins.filter(p => typeof p[key] === 'function');
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
    return true;
  } catch (error) {
    if (/^warn:\s/i.test(error)) {
      logger.warn(`Linting of ${path}: ${error}`);
    } else {
      rethrow('Linting')(error);
    }
    return false;
  }
}

// Extract files' paths that depend on current file.
async function getDependencies(file, compiler) {
  if (typeof compiler.getDependencies !== 'function') return [];

  debug(`Fetching dependencies ${file.path} @ ${compiler.brunchPluginName}`);
  try {
    let deps = compiler.getDependencies(file);
    if (!Array.isArray(deps) && deps instanceof Promise) deps = await deps;
    return deps.concat(deps.patterns || []).map(d => sysPath.normalize(d));
  } catch (error) {
    rethrow('Dependency parsing')(error);
  }
}

async function compile(file, compiler, isStatic) {
  const {path} = file;
  const op = isStatic ? 'Compiling asset' : 'Compiling';
  debug(`${op} ${path} @ ${compiler.brunchPluginName}`);

  try {
    const method = isStatic ? 'compileStatic' : 'compile';
    const compiled = await compiler[method](file);
    if (compiled == null) return file;
    if (compiled.data == null) {
      throw new BrunchError('FILE_DATA_INVALID', {path});
    }
    const _deps = compiled.dependencies;
    const dependencies = Array.isArray(_deps) ? _deps : await getDependencies(file, compiler);
    const cpath = compiled.path || file.path;
    const additional = isStatic ? {
      dependencies,
      path: compiler.staticTargetExtension ?
        cpath.replace(extRe, compiler.staticTargetExtension) :
        cpath,
    } : {
      dependencies: (file.dependencies || []).concat(dependencies),
      type: compiler.type,
      path: compiler.targetExtension ?
        cpath.replace(extRe, compiler.targetExtension) :
        cpath,
    };

    return Object.assign({}, compiled, additional);
  } catch (error) {
    rethrow(op)(error);
  }
}

/**
 * @returns {Promise<File>}
 */
async function nextCompiler(file, compilers, isStatic) {
  const prop = isStatic ? 'staticPattern' : 'pattern';
  const compiler = pull(compilers, comp => comp[prop].test(file.path));
  if (!compiler) return file;
  const newFile = await compile(file, compiler, isStatic);
  return nextCompiler(newFile, compilers, isStatic);
}

async function processFile(file, isStatic = false) {
  if (isStatic) {
    const compilers = respondTo('compileStatic').filter(comp => comp.type === 'template');
    return nextCompiler(file, compilers, true);
  }

  await lint(file);

  const {path} = file;
  const isNpm = deppack.isNpm(path);
  const usePlugin = isNpm ?
    comp => npmCompilers.includes(comp.brunchPluginName) :
    () => true;
  const compilers = respondTo('compile').filter(usePlugin);
  const processed = await nextCompiler(file, compilers, false);
  if (!isNpm) return processed;

  const wrapped = await deppack.wrapSourceInModule(processed.data, sysPath.resolve(path));
  processed.data = wrapped;
  return processed;
}

module.exports = {processFile, setPlugins};
