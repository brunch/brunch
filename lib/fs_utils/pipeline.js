'use strict';
const sysPath = require('universal-path');
const logger = require('loggy');
const debug = require('debug')('brunch:pipeline');
const deppack = require('deppack'); // isNpm
const processJob = require('../workers').processJob;
const BrunchError = require('../utils/error');

const rethrow = message => error => {
  throw new BrunchError(message, {error});
};

// Pipeline: File -> File.
// Takes file and a) lints b) compiles c) extracts dependencies from it.

// Run all linters.
const lint = file => {
  const path = file.path;
  const linters = respondTo('lint').filter(linter => {
    return linter.pattern.test(path);
  });

  return Promise.all(linters.map(linter => {
    debug(`Linting ${path} @ ${linter.brunchPluginName}`);
    return linter.lint(file);
  })).catch(error => {
    if (/^warn:\s/i.test(error)) {
      logger.warn(`Linting of ${path}: ${error}`);
    } else {
      rethrow('Linting')(error);
    }
  });
};

// Extract files' paths that depend on current file.
const getDependencies = (compiler, file) => {
  const name = compiler.brunchPluginName;

  if (typeof compiler.getDependencies === 'function') {
    if (file.dependencies != null) {
      throw new BrunchError('REMOVE_GET_DEPS', {name});
    }
  } else {
    return Promise.resolve([]);
  }

  debug(`Fetching dependencies ${file.path} @ ${name}`);
  return compiler.getDependencies(file).then(deps => {
    return deps.concat(deps.patterns || []).map(sysPath.normalize);
  }).catch(rethrow('Dependency parsing'));
};

const processAsset = file => {
  const history = new WeakSet();
  const nextCompiler = file => {
    const compiler = respondTo('compileStatic').find(plugin => {
      return plugin.staticPattern.test(file.path) && !history.has(plugin);
    });

    if (!compiler) return file;

    file = Object.assign({compiler}, file);
    history.add(compiler);

    return processJob(CompileStaticJob, file).then(nextCompiler);
  };

  return nextCompiler(file);
};

const _compileStatic = (file, compiler) => {
  const path = file.path;
  const name = compiler.brunchPluginName;
  debug(`Compiling asset ${path} @ ${name}`);

  return compiler.compileStatic(file).then(compiled => {
    if (compiled == null) return file;
    if (compiled.data == null) {
      throw new BrunchError('FILE_DATA_INVALID', {path});
    }

    return getDependencies(compiler, file).then(dependencies => {
      return Object.assign({
        dependencies,
        path: compiled.path || compiler.staticTargetExtension
          ? path.replace(compiler.staticPattern, `.${compiler.staticTargetExtension}`)
          : path,
      }, compiled);
    });
  }).catch(rethrow('Compiling'));
};

const compile = compiler => params => {
  if (!params) return;

  const source = params.source || params.data;
  const path = params.path;
  const name = compiler.brunchPluginName;
  debug(`Compiling ${path} @ ${name}`);

  const file = {
    data: params.compiled || source,
    path,
    map: params.sourceMap,
  };

  return compiler.compile(file).then(result => {
    if (result == null) return;

    const compiled = result.data;
    if (compiled == null) {
      throw new BrunchError('FILE_DATA_INVALID', {path});
    }

    const jsExports = result.exports;
    const sourceMap = result.map || params.sourceMap;

    return getDependencies(compiler, {data: source, path})
      .then(dependencies => {
        return {dependencies, compiled, source, sourceMap, path: result.path || path, jsExports};
      });
  }).catch(rethrow('Compiling'));
};

const CompileJob = {
  path: 'CompileJob',

  serialize(hash) {
    return {path: hash.path, source: hash.source};
  },

  deserialize(ctx, hash) {
    const path = hash.path;
    const isFor = plugin => plugin.pattern.test(path);

    const linters = ctx.plugins.linters.filter(isFor);
    const compilers = ctx.plugins.compilers.filter(isFor);

    return {path, source: hash.source, linters, compilers};
  },

  work(hash) {
    const file = {data: hash.source, path: hash.path};

    return lint(file, hash.linters).then(() => {
      return promiseReduce(hash.compilers, compile, file);
    });
  },
};

const CompileStaticJob = {
  path: 'CompileStaticJob',

  serialize(hash) {
    const compilerName = hash.compiler.brunchPluginName;
    return {data: hash.data, path: hash.path, compilerName};
  },

  deserialize(ctx, hash) {
    const compiler = ctx.plugins.staticCompilers.find(compiler => {
      return compiler.brunchPluginName === hash.compilerName;
    });
    return {data: hash.data, path: hash.path, compiler};
  },

  work(hash) {
    const file = {data: hash.data, path: hash.path};
    return _compileStatic(file, hash.compiler);
  },
};

const pipeline = (path, linters, compilers, depCompilers) => {
  const file = readFromCache(path).catch(rethrow('Reading'));

  if (deppack.isNpm(path)) {
    const _path = sysPath.resolve('.', path);
    const selectedCompilers = depCompilers.length ? compilers.filter(compiler => {
      const name = compiler.brunchPluginName;
      return name === 'javascript-brunch' || depCompilers.includes(name);
    }) : [];

    return file.then(source => {
      if (selectedCompilers.length) {
        return processJob(CompileJob, {path, source, linters: [], compilers: selectedCompilers});
      }
      return {compiled: source, source, path};
    }).then(file => {
      return deppack.wrapSourceInModule(file.compiled, _path).then(compiled => {
        file.compiled = compiled;
        return file;
      });
    }).then(file => {
      return {compiled: file.compiled, source: file.source, path};
    });
  }

  return file.then(source => processJob(CompileJob, {path, source, linters, compilers}));
};

const plugins = [];
const respondTo = key => plugins.filter(plugin => {
  return typeof plugin[key] === 'function';
});

module.exports = {
  pipeline,
  processAsset,
  CompileJob,
  CompileStaticJob,
  setPlugins(to) {
    [].push.apply(plugins, to);
  },
};
