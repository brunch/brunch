'use strict';
const debug = require('debug')('brunch:generate');
const basename = require('path').basename;
const anysort = require('anysort');
const smap = require('source-map');
const deppack = require('../deppack'); // needsProcessing, processFiles
const helpers = require('../helpers'); // flatten, promisifyPlugin
const processJob = require('../workers');
const common = require('./common');

const SourceMapConsumer = smap.SourceMapConsumer;
const SourceMapGenerator = smap.SourceMapGenerator;
const SourceNode = smap.SourceNode;

// Generate: [File] -> File.
// Takes a list of files (FileList) and makes one output from it.


/* Sorts by pattern.
 *
 * Examples
 *
 *   sort ['b.coffee', 'c.coffee', 'a.coffee'],
 *     before: ['a.coffee'], after: ['b.coffee']
 *   # ['a.coffee', 'c.coffee', 'b.coffee']
 *
 * Returns new sorted array.
 */

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
  const conventions = norm.conventions;
  const packageInfo = norm.packageInfo;
  const vendorConvention = conventions.vendor;
  const bower = packageInfo.bower.order;
  return {
    before: before,
    after: after,
    vendorConvention: vendorConvention,
    bower: bower
  };
};

const sort = (files, config, joinToValue) => {
  const paths = files.map(file => file.path);
  const indexes = Object.create(null);
  files.forEach(file => indexes[file.path] = file);
  const order = extractOrder(files, config);
  if (Array.isArray(joinToValue)) order.joinToValue = joinToValue;
  return sortByConfig(paths, order).map(path => indexes[path]);
};


/* New. */
const slashes = string => string.replace('\\', '/');

const semi = ';';
const concat = (files, path, definition, autoRequire, config) => {
  if (autoRequire == null) autoRequire = [];
  const isJs = !!definition;

  /* nodes = files.map toNode */
  const root = new SourceNode();
  const str = files.map(f => f.path).join(', ');
  debug(`Concatenating [${str}] => ${path}`);

  const isNpm = config.npm.enabled ? deppack.needsProcessing : () => false;
  const isntNpm = f => !isNpm(f);
  const nonNpmFiles = files.filter(isntNpm);
  const npmFiles = files.filter(isNpm);

  const processor = (file) => {
    root.add(file.node);
    const data = file.node.isIdentity ? file.data : file.source;
    if (isJs && data.trim().substr(-1) !== semi) root.add(semi);
    return root.setSourceContent(file.node.source, data);
  };

  if (config.npm.enabled && isJs && npmFiles.length > 0) {
    deppack.processFiles(root, npmFiles, processor);
  }

  nonNpmFiles.forEach(processor);

  if (isJs) {
    root.prepend(definition(path, root.sourceContents));
  }
  autoRequire.forEach(req => root.add("require('" + slashes(req) + "');"));
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

    /* Old API: optimize(data, path, callback) */
    /* New API: optimize({data, path, map}, callback) */
    const optimizerArgs = optimizer.optimize.length === 2 || optimizer.optimize.length === 1 ?
      [params] : [params.data, params.path];

    return helpers.promisifyPlugin(1, optimizer.optimize)
      .apply(optimizer, optimizerArgs);
  }
};

const runOptimizer = (optimizer, params) => {
  if (!params) throw new Error('Invalid optimizer run' + optimizer);
  const map = params.map;
  const path = params.path;
  const sourceFiles = params.sourceFiles;
  debug(`Optimizing ${path} @ ${optimizer.constructor.name}`);

  return processJob(OptimizeJob, {optimizer, params})
    .then(optimized => {
      const isObj = toString.call(optimized) === '[object Object]';
      const optimizedCode = isObj ? optimized.data : optimized;
      const optimizedMap = isObj ? optimized.map : null;

      let newMap;
      if (optimizedMap != null) {
        newMap = SourceMapGenerator.fromSourceMap(
          new SourceMapConsumer(optimizedMap));
        if (newMap._sourcesContents == null) newMap._sourcesContents = {};
        sourceFiles.forEach(arg => {
          const path = arg.path;
          const source = arg.source;
          newMap._sourcesContents['$' + path] = source;
        });
      } else {
        newMap = map;
      }
      return Promise.resolve({
        data: optimizedCode,
        code: optimizedCode,
        map: newMap,
        path: path,
        sourceFiles: sourceFiles
      });
    });
};

const optimize = (data, map, path, optimizers, sourceFiles) => {
  const initial = {
    data: data,
    code: data,
    map: map,
    path: path,
    sourceFiles: sourceFiles
  };

  // Run each optimizer in a waterfall.
  const result = optimizers.reduce((promise, optimizer) => {
    return promise.then(runOptimizer.bind(null, optimizer));
  }, Promise.resolve(initial));

  return result;
};

const jsTypes = ['javascript', 'template'];

const generate = (path, sourceFiles, config, optimizers) => {
  const type = sourceFiles.some(file => jsTypes.indexOf(file.type) >= 0) ?
    'javascript' : 'stylesheet';
  const foptim = optimizers.filter(optimizer => optimizer.type === type);
  const len = config.paths['public'].length + 1;
  const joinKey = path.slice(len);
  const typeConfig = config.files[type + 's'] || {};
  const joinToValue = (typeConfig.joinTo && typeConfig.joinTo[joinKey]) || {};
  const sorted = sort(sourceFiles, config, joinToValue);
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
  return optimize(code, map, path, foptim, sourceFiles)
    .then(data => {
      if (withMaps) {
        const mapRoute = config.sourceMaps === 'absoluteUrl' ?
          slashes(mapPath.replace(config.paths['public'], '')) :
          basename(mapPath);
        const controlChar = config.sourceMaps === 'old' ? '@' : '#';
        const end = `${controlChar} sourceMappingURL=${mapRoute}`;
        data.code += type === 'javascript' ? `\n//${end}` : `\n/*${end}*/`;
      }
      return data;
    }, error => {
      return Promise.reject(error);
    })
    .then(data => {
      return common.writeFile(path, data.code).then(() => {
        return data;
      });
    })
    .then(data => {
      if (withMaps) {
        return common.writeFile(mapPath, data.map.toString()).then(() => {
          return data;
        });
      }
      return data;
    });
};

generate.sortByConfig = sortByConfig;

module.exports = generate;
module.exports.OptimizeJob = OptimizeJob;
