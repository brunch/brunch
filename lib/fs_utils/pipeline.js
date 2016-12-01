'use strict';
const sysPath = require('universal-path');
const logger = require('loggy');
const debug = require('debug')('brunch:pipeline');
const deppack = require('deppack'); // isNpm
const parallel = require('../workers').parallel;
const BrunchError = require('../utils/error');
const pull = require('../utils/helpers').pull;

// Pipeline: File -> File.
// Takes file and a) lints b) compiles c) extracts dependencies from it.

const rethrow = message => error => {
  throw new BrunchError(message, {error});
};

const lint = file => {
  const path = file.path;
  const linters = respondTo('lint').filter(linter => {
    return linter.pattern.test(path);
  }).map(linter => {
    debug(`Linting ${path} @ ${linter.brunchPluginName}`);
    return linter.lint(file);
  });

  return Promise.all(linters).catch(error => {
    if (/^warn:\s/i.test(error)) {
      logger.warn(`Linting of ${path}: ${error}`);
    } else {
      rethrow('Linting')(error);
    }
  }).then(() => file);
};

const compileStatic = (file, compiler) => {
  const path = file.path;
  const name = compiler.brunchPluginName;
  debug(`Compiling asset ${path} @ ${name}`);

  return compiler.compileStatic(file).then(compiled => {
    if (compiled == null) return file;
    if (compiled.data == null) {
      throw new BrunchError('FILE_DATA_INVALID', {path});
    }

    return getDependencies(file, compiler).then(dependencies => {
      return Object.assign({
        dependencies,
        path: compiled.path || (compiler.staticTargetExtension ?
          path.replace(compiler.staticPattern, `.${compiler.staticTargetExtension}`) :
          path),
      }, compiled);
    });
  }).catch(rethrow('Compiling asset'));
};

const compile = (file, compiler) => {
  const path = file.path;
  const name = compiler.brunchPluginName;
  debug(`Compiling ${path} @ ${name}`);

  return compiler.compile(file).then(compiled => {
    if (compiled == null) return file;
    if (compiled.data == null) {
      throw new BrunchError('FILE_DATA_INVALID', {path});
    }

    return getDependencies(file, compiler).then(dependencies => {
      return Object.assign({
        dependencies,
        type: compiler.type,
        path: compiled.path || (compiler.targetExtension ?
          path.replace(compiler.pattern, `.${compiler.targetExtension}`) :
          path),
      }, compiled);
    });
  }).catch(rethrow('Compiling'));
};

// Extract files' paths that depend on current file.
const getDependencies = (file, compiler) => {
  const name = compiler.brunchPluginName;

  if (typeof compiler.getDependencies === 'function') {
    if (file.dependencies != null) {
      throw new BrunchError('REMOVE_GET_DEPS', {name});
    }
  } else {
    return Promise.resolve();
  }

  debug(`Fetching dependencies ${file.path} @ ${name}`);
  return compiler.getDependencies(file).then(deps => {
    return deps.concat(deps.patterns || []).map(sysPath.normalize);
  }).catch(rethrow('Dependency parsing'));
};

const processAsset = parallel('PROCESS_ASSET', file => {
  const compilers = respondTo('compileStatic');
  const nextCompiler = file => {
    const compiler = pull(compilers, compiler => {
      return compiler.staticPattern.test(file.path);
    });

    return compiler ?
      compileStatic(file, compiler).then(nextCompiler) :
      file;
  };

  return nextCompiler(file);
});

const processFile = parallel('PROCESS_FILE', file => {
  const path = file.path;
  const isNpm = deppack.isNpm(path);

  const usePlugin = isNpm && npmCompilers.length ?
    compiler => npmCompilers.includes(compiler.brunchPluginName) :
    () => true;

  const compilers = respondTo('compile').filter(usePlugin);
  const nextCompiler = file => {
    const compiler = pull(compilers, compiler => {
      return compiler.pattern.test(file.path);
    });

    return compiler ?
      compile(file, compiler).then(nextCompiler) :
      file;
  };

  const compiled = lint(file).then(nextCompiler);
  if (!isNpm) return compiled;

  return compiled.then(file => {
    const absPath = sysPath.resolve(path);

    return deppack.wrapSourceInModule(file.compiled, absPath).then(compiled => {
      file.compiled = compiled;
      return file;
    });
  });
});

const plugins = [];
const npmCompilers = [];
const respondTo = key => plugins.filter(plugin => {
  return typeof plugin[key] === 'function';
});

module.exports = {
  processAsset,
  processFile,
  setPlugins(array) {
    [].push.apply(plugins, array);
  },
  setNpmCompilers(array) {
    [].push.apply(npmCompilers, array);
  },
};
