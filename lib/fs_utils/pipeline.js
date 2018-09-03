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

const extRe = /(\.\w+)+$/;
const rethrow = message => error => {
  if (!(error instanceof Error)) {
    error = new Error(error);
  }

  error.pipelineCode = message;
  throw error;
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
  debug(`Compiling asset ${path} @ ${compiler.brunchPluginName}`);

  return compiler.compileStatic(file).then(compiled => {
    if (compiled == null) return file;
    if (compiled.data == null) {
      throw new BrunchError('FILE_DATA_INVALID', {path});
    }

    const deps = Array.isArray(compiled.dependencies) ?
      Promise.resolve(compiled.dependencies) :
      getDependencies(file, compiler);

    return deps.then(dependencies => {
      const path = compiled.path || file.path;

      return Object.assign({}, compiled, {
        dependencies,
        path: compiler.staticTargetExtension ?
          path.replace(extRe, compiler.staticTargetExtension) :
          path,
      });
    });
  }).catch(rethrow('Compiling asset'));
};

// Extract files' paths that depend on current file.
const getDependencies = (file, compiler) => {
  if (typeof compiler.getDependencies !== 'function') {
    return Promise.resolve();
  }

  debug(`Fetching dependencies ${file.path} @ ${compiler.brunchPluginName}`);
  return compiler.getDependencies(file).then(deps => {
    return deps.concat(deps.patterns || []).map(sysPath.normalize);
  }).catch(rethrow('Dependency parsing'));
};

const processAsset = parallel('PROCESS_ASSET', file => {
  const compilers = respondTo('compileStatic').filter(compiler => {
    return compiler.type === 'template';
  });

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

const compile = (file, compiler) => {
  const path = file.path;
  debug(`Compiling ${path} @ ${compiler.brunchPluginName}`);

  return compiler.compile(file).then(compiled => {
    if (compiled == null) return file;
    if (compiled.data == null) {
      throw new BrunchError('FILE_DATA_INVALID', {path});
    }

    const deps = Array.isArray(compiled.dependencies) ?
      Promise.resolve(compiled.dependencies) :
      getDependencies(file, compiler);

    return deps.then(dependencies => {
      const path = compiled.path || file.path;

      return Object.assign({}, compiled, {
        dependencies: (file.dependencies || []).concat(dependencies || []),
        type: compiler.type,
        path: compiler.targetExtension ?
          path.replace(extRe, compiler.targetExtension) :
          path,
      });
    });
  }).catch(rethrow('Compiling'));
};

const processFile = parallel('PROCESS_FILE', file => {
  const path = file.path;
  const isNpm = deppack.isNpm(path);

  const usePlugin = isNpm ?
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

    return deppack.wrapSourceInModule(file.data, absPath).then(wrapped => {
      file.data = wrapped;
      return file;
    });
  });
});

const respondTo = key => plugins.filter(plugin => {
  return typeof plugin[key] === 'function';
});

let plugins = [];
let npmCompilers = [];

module.exports = {
  processAsset,
  processFile,
  setPlugins(array) {
    plugins = array;
  },
  setNpmCompilers(array) {
    npmCompilers = array;
  },
};
