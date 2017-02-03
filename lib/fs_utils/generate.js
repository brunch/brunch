'use strict';
const debug = require('debug')('brunch:generate');
const sysPath = require('universal-path');
const anysort = require('anysort');
const promisify = require('micro-promisify');
const fsWriteFile = promisify(require('fs').writeFile);
const mkdirp = promisify(require('mkdirp'));
const unlink = promisify(require('fs').unlink);
const deppack = require('deppack'); // needsProcessing, processFiles
const helpers = require('../utils/helpers');
const flatten = helpers.flatten;
const promiseReduce = helpers.promiseReduce;
const formatOptimizerError = helpers.formatOptimizerError;
const processJob = require('../workers').processJob;
const hmr = require('../utils/hmr'); // isEnabled, generate
const BrunchError = require('../utils/error');

const smap = require('source-map');
const SourceMapConsumer = smap.SourceMapConsumer;
const SourceMapGenerator = smap.SourceMapGenerator;
const SourceNode = smap.SourceNode;

// Generate: [File] -> File.
// Takes a list of files (FileList) and makes one output from it.

// Writes data into a file.
// Creates the file and/or all parent directories if they don't exist.
// Returns a promise (not valued if success).
const writeFile = (path, data) => {
  debug(`Writing ${path}`);
  const write = () => fsWriteFile(path, data);
  const rwxrxrx = 0o755;

  return write().catch(() => {
    return mkdirp(sysPath.dirname(path), rwxrxrx).then(write);
  });
};

// Sorts by pattern.
// sort(['b.coffee', 'c.coffee', 'a.coffee'], {before: ['a.coffee'], after: ['b.coffee']})
// => ['a.coffee', 'c.coffee', 'b.coffee']
// Returns new sorted array.
const sortByConfig = (files, config) => {
  if (toString.call(config) !== '[object Object]') return files;
  const criteria = [
    config.before || [],
    config.after || [],
    config.joinToValue || [],
    config.bower || [],
    config.vendorConvention || (() => false),
  ];
  return anysort.grouped(files, criteria, [0, 2, 3, 4, 5, 1]);
};

const extractOrder = (files, config) => {
  const types = files.map(file => `${file.type}s`);
  const orders = Object.keys(config.files)
    .filter(key => types.includes(key))
    .map(key => config.files[key].order || {});
  const before = flatten(orders.map(type => type.before || []));
  const after = flatten(orders.map(type => type.after || []));
  const norm = config._normalized;
  const vendorConvention = norm.conventions.vendor;
  const bower = norm.packageInfo.bower.order;
  return {before, after, vendorConvention, bower};
};

const sort = (files, config, joinToValue) => {
  const paths = files.map(file => file.path);
  const indexes = Object.create(null);
  files.forEach(file => {
    indexes[file.path] = file;
  });
  const order = extractOrder(files, config);
  if (Array.isArray(joinToValue)) order.joinToValue = joinToValue;
  return sortByConfig(paths, order).map(path => indexes[path]);
};

const concat = (files, path, definitionFn, autoRequire, config) => {
  if (autoRequire == null) autoRequire = [];
  const isJs = !!definitionFn;

  const root = new SourceNode();
  const str = files.map(f => f.path).join(', ');
  debug(`Concatenating [${str}] => ${path}`);

  const processor = file => {
    root.add(file.node);
    const data = file.node.isIdentity ? file.data : file.source;
    if (isJs && !/;\s*$/.test(data)) root.add(';');
    return root.setSourceContent(file.node.source, data);
  };

  if (isJs) {
    const addRequire = req => root.add(`require('${req}');`);

    const isNpm = config.npm.enabled ? deppack.needsProcessing : () => false;
    const isHmr = hmr.isEnabled(config);

    const moduleFiles = files.filter(f => isNpm(f) || f.file.isModule);
    const nonModuleFiles = files.filter(f => !moduleFiles.includes(f));

    const definition = definitionFn(path, root.sourceContents);
    const generateModuleFiles = () => {
      if (config.npm.enabled && moduleFiles.length) {
        deppack.processFiles(root, moduleFiles, processor);
      } else {
        moduleFiles.forEach(processor);
      }
    };

    const basicGenerate = (generateModuleFiles, nonModuleFiles, processor, deppack, definition, path, root) => {
      root.add(definition);
      generateModuleFiles();
      nonModuleFiles.forEach(processor);
    };

    const generator = isHmr ? hmr.generate : basicGenerate;
    generator(generateModuleFiles, nonModuleFiles, processor, deppack, definition, path, root);

    autoRequire.forEach(addRequire);
  } else {
    files.forEach(processor);
  }
  return root.toStringWithSourceMap({file: path});
};

const prepareSourceMap = (optimizedMap, sourceFiles) => {
  if (optimizedMap == null) return;
  const map = SourceMapGenerator.fromSourceMap(new SourceMapConsumer(optimizedMap));
  if (map._sourcesContents == null) map._sourcesContents = {};
  sourceFiles.forEach(arg => {
    const path = arg.path;
    const source = arg.source;
    map._sourcesContents[path] = source;
  });
  return map;
};

const runOptimizer = optimizer => params => {
  if (!params) {
    throw new BrunchError('OPTIMIZER_INVALID', {optimizer});
  }
  const unoptMap = params.map;
  const path = params.path;
  const sourceFiles = params.sourceFiles;
  debug(`Optimizing ${path} @ ${optimizer.brunchPluginName}`);

  return processJob('OptimizeJob', {optimizer, params}).then(optimized => {
    const data = optimized.data;
    const map = prepareSourceMap(optimized.map, sourceFiles) || unoptMap;
    return {data, path, map, sourceFiles, code: data};
  }, error => {
    throw formatOptimizerError(error, path);
  });
};

const optimize = (data, map, path, optimizers, sourceFiles) => {
  const initial = {data, path, map, sourceFiles, code: data};
  return promiseReduce(optimizers, runOptimizer, initial);
};

const getInlineSourceMapUrl = map => {
  const base64String = new Buffer(JSON.stringify(map)).toString('base64');
  return `data:application/json;charset=utf-8;base64,${base64String}`;
};

const jsTypes = ['javascript', 'template'];

const generate = (path, targets, config, optimizers) => {
  const type = targets.some(file => jsTypes.includes(file.type)) ?
    'javascript' : 'stylesheet';

  const foptim = optimizers.filter(optimizer => optimizer.type === type);
  const joinKey = path.slice(config.paths.public.length + 1);
  const typeConfig = config.files[`${type}s`] || {};
  const joinToValue = typeConfig.joinTo && typeConfig.joinTo[joinKey] || {};
  const sorted = sort(targets, config, joinToValue);
  const norm = config._normalized;
  const definition = type === 'javascript' ? norm.modules.definition : null;
  const cc = concat(
    sorted, path, definition,
    norm.modules.autoRequire[joinKey],
    config
  );
  const code = cc.code;
  const map = cc.map;
  const withMaps = map && config.sourceMaps;
  const mapPath = `${path}.map`;
  return optimize(code, map, path, foptim, targets)
    .then(data => {
      if (withMaps) {
        const mapRoute = config.sourceMaps === 'inline' ?
          getInlineSourceMapUrl(data.map) :
          config.sourceMaps === 'absoluteUrl' ?
          mapPath.replace(config.paths.public, '') :
          sysPath.basename(mapPath);
        const controlChar = config.sourceMaps === 'old' ? '@' : '#';
        const end = `${controlChar} sourceMappingURL=${mapRoute}`;
        data.code += type === 'javascript' ? `\n//${end}` : `\n/*${end}*/`;
      }
      return data;
    })
    .then(data => {
      return Promise.all([
        writeFile(path, data.code),
        withMaps && config.sourceMaps !== 'inline' && writeFile(mapPath, data.map.toString()),
      ]).then(() => data);
    });
};

generate.writeFile = writeFile;

generate.writeStatics = (toRemove, toWrite) => {
  const removePromise = promiseReduce(toRemove, file => {
    file.dispose();
    return () => unlink(file.destinationPath);
  });

  const writePromise = promiseReduce(toWrite, file => {
    return () => writeFile(file.destinationPath, file.compiled);
  });

  return removePromise.then(() => writePromise);
};

generate.sortByConfig = sortByConfig;

module.exports = generate;
