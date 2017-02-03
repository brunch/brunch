const mediator = require('./mediator');
// const deppack = require('deppack');
const sysPath = require('path');
const smap = require('source-map');
const SourceMapConsumer = smap.SourceMapConsumer;
const SourceMapGenerator = smap.SourceMapGenerator;
const SourceNode = smap.SourceNode;

exports.OPTIMIZE_FILE = (hash) => {
  // {data, path, map, sourceFiles, code: data}
  const optimizer = mediator.plugins.optimizers.find(p => p.brunchPluginName === hash.brunchPluginName);
  const file = hash;

  if (file.map && file.map.version) {
    file.map = SourceMapGenerator.fromSourceMap(new SourceMapConsumer((file.map)));
  }

  return optimizer.optimize(file);
};

const respondTo = key => mediator.plugins.all.filter(plugin => {
  return typeof plugin[key] === 'function';
});

const pull = (array, is) => {
  const index = array.findIndex(is);
  if (index === -1) return;

  const item = array[index];
  array.splice(index, 1);
  return item;
};

exports.COMPILE_STATIC = (file) => {
  const compileStatic = (file, compiler) => {
    // need file, compiler
    const path = file.path;
    // debug(`Compiling asset ${path} @ ${compiler.brunchPluginName}`);

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
    });
  };

  const compilers = respondTo('compileStatic').filter(compiler => {
    return compiler.type === 'template';
  });

  const nextCompiler = file => {
    const compiler = pull(compilers, compiler => {
      return compiler.staticPattern.test(file.path);
    });

    return compiler ?
      compileStatic(file, compiler).then(nextCompiler) :
      Promise.resolve(file);
  };

  return nextCompiler(file);
};



// ========


// x deppack
// x npmCompilers
// x compile
// x lint

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
    // debug(`Linting ${path} @ ${linter.brunchPluginName}`);
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

// Extract files' paths that depend on current file.
const getDependencies = (file, compiler) => {
  if (typeof compiler.getDependencies !== 'function') {
    return Promise.resolve();
  }

  // debug(`Fetching dependencies ${file.path} @ ${compiler.brunchPluginName}`);
  return compiler.getDependencies(file).then(deps => {
    return deps.concat(deps.patterns || []).map(sysPath.normalize);
  }).catch(rethrow('Dependency parsing'));
};

const compile = (file, compiler) => {
  const path = file.path;
  // debug(`Compiling ${path} @ ${compiler.brunchPluginName}`);

  return compiler.compile(file).then(compiled => {
    if (compiled == null) return file;
    if (compiled.data == null) {
      throw new Error('FILE_DATA_INVALID', {path});
    }

    const deps = Array.isArray(compiled.dependencies) ?
      Promise.resolve(compiled.dependencies) :
      getDependencies(file, compiler);

    return deps.then(dependencies => {
      const path = compiled.path || file.path;

      return Object.assign({}, compiled, {
        dependencies,
        type: compiler.type,
        path: compiler.targetExtension ?
          path.replace(extRe, compiler.targetExtension) :
          path,
      });
    });
  }).catch(rethrow('Compiling'));
};

exports.PROCESS_FILE = (file) => {
  const path = file.path;
  const isNpm = deppack.isNpm(path);

  const usePlugin = isNpm ?
    compiler => mediator.config.npm.compilers.includes(compiler.brunchPluginName) :
    () => true;

  const compilers = respondTo('compile').filter(usePlugin);
  const nextCompiler = file => {
    const compiler = pull(compilers, compiler => {
      return compiler.pattern.test(file.path);
    });

    return compiler ?
      compile(file, compiler).then(nextCompiler) :
      Promise.resolve(file);
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
}
