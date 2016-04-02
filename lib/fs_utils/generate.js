'use strict';
const debug = require('debug')('brunch:generate');
const sysPath = require('path');
const anysort = require('anysort');
const promisify = require('micro-promisify');
const fsWriteFile = promisify(require('fs').writeFile);
const mkdirp = promisify(require('mkdirp'));
const deppack = require('deppack'); // needsProcessing, processFiles
const helpers = require('../helpers'); // flatten, promisifyPlugin
const processJob = require('../workers').processJob;
const isHmrEnabled = require('../hmr').isEnabled;
const hmrGenerate = require('../hmr').generate;

const smap = require('source-map');
const SourceMapConsumer = smap.SourceMapConsumer;
const SourceMapGenerator = smap.SourceMapGenerator;
const SourceNode = smap.SourceNode;

// Generate: [File] -> File.
// Takes a list of files (FileList) and makes one output from it.

// Writes data into a file.
// Creates the file and/or all parent directories if they don't exist.
// Returns a promise (not valued if success).
const perm0755 = 0o755;
const writeFile = (path, data) => {
  debug(`Writing ${path}`);
  const write = () => fsWriteFile(path, data);
  return write().catch(() => {
    return mkdirp(sysPath.dirname(path), perm0755).then(write);
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
    config.vendorConvention || (() => false)
  ];
  return anysort.grouped(files, criteria, [0, 2, 3, 4, 5, 1]);
};

const extractOrder = (files, config) => {
  const types = files.map(file => file.type + 's');
  const orders = Object.keys(config.files)
    .filter(key => types.indexOf(key) >= 0)
    .map(key => config.files[key].order || {});
  const before = helpers.flatten(orders.map(type => type.before || []));
  const after = helpers.flatten(orders.map(type => type.after || []));
  const norm = config._normalized;
  const vendorConvention = norm.conventions.vendor;
  const bower = norm.packageInfo.bower.order;
  return {before, after, vendorConvention, bower};
};

const sort = (files, config, joinToValue) => {
  const paths = files.map(file => file.path);
  const indexes = Object.create(null);
  files.forEach(file => indexes[file.path] = file);
  const order = extractOrder(files, config);
  if (Array.isArray(joinToValue)) order.joinToValue = joinToValue;
  return sortByConfig(paths, order).map(path => indexes[path]);
};


// New.
const slashes = string => string.replace('\\', '/');

const semi = ';';
const concat = (files, path, definitionFn, autoRequire, config) => {
  if (autoRequire == null) autoRequire = [];
  const isJs = !!definitionFn;

  // nodes = files.map(toNode);
  const root = new SourceNode();
  const str = files.map(f => f.path).join(', ');
  debug(`Concatenating [${str}] => ${path}`);

  const processor = (file) => {
    root.add(file.node);
    const data = file.node.isIdentity ? file.data : file.source;
    if (isJs && data.trim().substr(-1) !== semi) root.add(semi);
    return root.setSourceContent(file.node.source, data);
  };

  if (isJs) {
    const addRequire = req => root.add(`require('${slashes(req)}');`);

    const isNpm = config.npm.enabled ? deppack.needsProcessing : () => false;
    const isHmr = isHmrEnabled(config);

    const moduleFiles = files.filter(f => isNpm(f) || f.file.isModule);
    const nonModuleFiles = files.filter(f => moduleFiles.indexOf(f) === -1);

    const definition = definitionFn(path, root.sourceContents);
    const generateModuleFiles = () => {
      if (config.npm.enabled && moduleFiles.length > 0) {
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

    const generator = isHmr ? hmrGenerate : basicGenerate;
    generator(generateModuleFiles, nonModuleFiles, processor, deppack, definition, path, root);

    autoRequire.forEach(addRequire);
  } else {
    files.forEach(processor);
  }
  return root.toStringWithSourceMap({
    file: path
  });
};

const OptimizeJob = {
  path: 'OptimizeJob',

  serialize(hash) {
    const optimizer = hash.optimizer.constructor.brunchPluginName;
    const params = hash.params;
    return {optimizer, params: {data: params.data, map: params.map, path: params.path}};
  },

  deserialize(ctx, hash) {
    const optimizer = ctx.plugins.optimizers.find(p => p.constructor.brunchPluginName === hash.optimizer);

    const deserializeSourceMap = serializedMap => {
      const sm = require('source-map');
      return sm.SourceMapGenerator.fromSourceMap(new sm.SourceMapConsumer(serializedMap));
    };

    const params = hash.params;
    params.map = deserializeSourceMap(params.map);

    return {optimizer, params};
  },

  work(hash) {
    const optimizer = hash.optimizer;
    const params = hash.params;

    // Old API: optimize(data, path, callback)
    // New API: optimize({data, path, map}, callback)
    const optimizerArgs = optimizer.optimize.length === 2 || optimizer.optimize.length === 1 ?
      [params] : [params.data, params.path];

    return helpers.promisifyPlugin(1, optimizer.optimize)
      .apply(optimizer, optimizerArgs);
  }
};

const prepareSourceMap = (optimizedMap, sourceFiles) => {
  if (optimizedMap == null) return;
  const map = SourceMapGenerator.fromSourceMap(new SourceMapConsumer(optimizedMap));
  if (map._sourcesContents == null) map._sourcesContents = {};
  sourceFiles.forEach(arg => {
    const path = arg.path;
    const source = arg.source;
    map._sourcesContents['$' + path] = source;
  });
  return map;
};

const runOptimizer = (optimizer, params) => {
  if (!params) throw new Error('Invalid optimizer run ' + optimizer);
  const unoptMap = params.map;
  const path = params.path;
  const sourceFiles = params.sourceFiles;
  debug(`Optimizing ${path} @ ${optimizer.constructor.name}`);

  return processJob(OptimizeJob, {optimizer, params}).then(res => {
    const optimized = typeof res === 'string' ? {data: res} : res;
    const data = optimized.data;
    const map = prepareSourceMap(optimized.map, sourceFiles) || unoptMap;
    return Promise.resolve({data, path, map, sourceFiles, code: data});
  });
};

const optimize = (data, map, path, optimizers, sourceFiles) => {
  const initial = {data, path, map, sourceFiles, code: data};

  // Run each optimizer in a waterfall.
  const result = optimizers.reduce((promise, optimizer) => {
    return promise.then(runOptimizer.bind(null, optimizer));
  }, Promise.resolve(initial));

  return result;
};

const jsTypes = ['javascript', 'template'];

const generate = (path, targets, config, optimizers) => {
  const type = targets.some(file => jsTypes.indexOf(file.type) >= 0) ?
    'javascript' : 'stylesheet';

  const foptim = optimizers.filter(optimizer => optimizer.type === type);
  const len = config.paths['public'].length + 1;
  const joinKey = path.slice(len);
  const typeConfig = config.files[type + 's'] || {};
  const joinToValue = (typeConfig.joinTo && typeConfig.joinTo[joinKey]) || {};
  const sorted = sort(targets, config, joinToValue);
  const norm = config._normalized;
  const definition = type === 'javascript' ? norm.modules.definition : null;
  const cc = concat(
    sorted, path, definition,
    norm.modules.autoRequire[slashes(joinKey)],
    config
  );
  const code = cc.code;
  const map = cc.map;
  const withMaps = map && config.sourceMaps;
  const mapPath = path + '.map';
  return optimize(code, map, path, foptim, targets)
    .then(data => {
      if (withMaps) {
        const mapRoute = config.sourceMaps === 'absoluteUrl' ?
          slashes(mapPath.replace(config.paths['public'], '')) :
          sysPath.basename(mapPath);
        const controlChar = config.sourceMaps === 'old' ? '@' : '#';
        const end = `${controlChar} sourceMappingURL=${mapRoute}`;
        data.code += type === 'javascript' ? `\n//${end}` : `\n/*${end}*/`;
      }
      return data;
    }, error => {
      return Promise.reject(error);
    })
    .then(data => {
      return writeFile(path, data.code).then(() => data);
    })
    .then(data => {
      if (withMaps) {
        return writeFile(mapPath, data.map.toString()).then(() => data);
      }
      return data;
    });
};

generate.sortByConfig = sortByConfig;
generate.OptimizeJob = OptimizeJob;

module.exports = generate;
