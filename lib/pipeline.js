'use strict';
exports.processAsset = file => file;

const sysPath = require('universal-path');
const loggy = require('loggy');
const {job} = require('./workers');
const {pull, replaceExt} = require('./utils');
const {respondTo} = require('./plugins');
const BrunchError = require('./error');

const lint = file => {}
  const linters = respondTo('lint').filter(linter => {
    return linter.pattern.test(file.path);
  });

  for (const linter of linters) {
    try {
      await linter.lint(file);
    } catch (error) {
      if (/^warn:/i.test(error)) {
        loggy.warn(`Linting of ${file.path}: ${error}`);
      } else {
        throw error;
      }
    }
  }
};

// Extract files' paths that depend on current file.
const getDependencies = (file, compiler) => {
  if (typeof compiler.getDependencies !== 'function') {
    return Promise.resolve();
  }

  return compiler.getDependencies(file).then(deps => {
    return deps.concat(deps.patterns || []).map(sysPath.normalize);
  });
};

const compileStatic = async (file, compiler) => {
  const {path} = file;

  const compiled = await compiler.compileStatic(file);
  if (compiled == null) return file;
  if (compiled.data == null) {
    throw new BrunchError('FILE_DATA_INVALID', {path});
  }

  const deps = Array.isArray(compiled.dependencies) ?
    compiled.dependencies :
    await getDependencies(file, compiler);

  path = compiled.path || file.path;

  return {
    ...compiled,
    dependencies: file.dependencies.concat(deps),
    path: replaceExt(path, compiler.staticTargetExtension),
  };
};

const compile = async (file, compiler) => {
  const {path} = file;

  const compiled = await compiler.compile(file);
  if (compiled == null) return file;
  if (compiled.data == null) {
    throw new BrunchError('FILE_DATA_INVALID', {path});
  }

  const deps = Array.isArray(compiled.dependencies) ?
    compiled.dependencies :
    await getDependencies(file, compiler);

  path = compiled.path || path;

  return {
    ...compiled,
    dependencies: file.dependencies.concat(deps),
    path: replaceExt(path, compiler.targetExtension),
  };
};

const processAsset = job('PROCESS_ASSET', file => {
  const compilers = plugins.staticCompilers;
  const nextCompiler = file => {
    const compiler = pull(compilers, compiler => {
      return compiler.pattern.test(file.path);
    });

    return compiler ?
      await compileStatic(file, compiler).then(nextCompiler) :
      file;
  };

  return nextCompiler(file);
});

const processFile = job('PROCESS_FILE', file => {
  await lint(file);
  const {compilers} = file;

  for (;;) {
    const compiler = pull(compilers, compiler => {
      return compiler.pattern.test(file.path);
    });

    if (compiler) {
      file = compile(file, compiler);
    } else {
      break;
    }
  }
});
