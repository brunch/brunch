'use strict';
const promisify = require('../promise').promisify;
const debug = require('debug')('brunch:generate');
const basename = require('path').basename;
const anysort = require('anysort');
const common = require('./common');
const smap = require('source-map');

const SourceMapConsumer = smap.SourceMapConsumer;
const SourceMapGenerator = smap.SourceMapGenerator;
const SourceNode = smap.SourceNode;


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
    config.component || [],
    config.vendorConvention || (() => false)
  ];
  return anysort.grouped(files, criteria, [0, 2, 3, 4, 5, 6, 1]);
};

const flatten = (array) => {
  return array.reduce((acc, elem) => {
    return acc.concat(Array.isArray(elem) ? flatten(elem) : [elem]);
  }, []);
};

const extractOrder = (files, config) => {
  const types = files.map(file => file.type + 's');
  const orders = Object.keys(config.files)
    .filter(key => types.indexOf(key) >= 0)
    .map(key => config.files[key].order || {});
  const before = flatten(orders.map(type => type.before || []));
  const after = flatten(orders.map(type => type.after || []));
  const norm = config._normalized;
  const conventions = norm.conventions;
  const packageInfo = norm.packageInfo;
  const vendorConvention = conventions.vendor;
  const bower = packageInfo.bower.order;
  const component = packageInfo.component.order;
  return {
    before: before,
    after: after,
    vendorConvention: vendorConvention,
    bower: bower,
    component: component
  };
};

const sort = (files, config, joinToValue) => {
  const paths = files.map(file => file.path);
  const indexes = Object.create(null);
  files.forEach((file, index) => indexes[file.path] = file);
  const order = extractOrder(files, config);
  if (Array.isArray(joinToValue)) order.joinToValue = joinToValue;
  return sortByConfig(paths, order).map(path => indexes[path]);
};


/* New. */
const slashes = string => string.replace('\\', '/');

const concat = (files, path, type, definition, aliases, autoRequire) => {
  if (aliases == null) aliases = [];
  if (autoRequire == null) autoRequire = [];

  /* nodes = files.map toNode */
  const root = new SourceNode();
  debug("Concatenating " + (files.map(f => f.path).join(', ')) + " to " + path);
  files.forEach(file => {
    root.add(file.node);
    const data = file.node.isIdentity ? file.data : file.source;
    if (type === 'javascript' && ';' !== data.trim().substr(-1)) {
      root.add(';');
    }
    return root.setSourceContent(file.node.source, data);
  });
  if (type === 'javascript') {
    root.prepend(definition(path, root.sourceContents));
  }
  aliases.forEach(alias => {
    const key = Object.keys(alias)[0];
    return root.add("require.alias('" + key + "', '" + alias[key] + "');");
  });
  autoRequire.forEach(req => root.add("require('" + slashes(req) + "');"));
  return root.toStringWithSourceMap({
    file: path
  });
};

const optimizerChain = (params, optimizer) => {
  const data = params.data;
  const code = params.code;
  const map = params.map;
  const path = params.path;
  const sourceFiles = params.sourceFiles;
  debug("Optimizing '" + path + "' with '" + optimizer.constructor.name + "'");

  /* Old API: optimize(data, path, callback) */
  /* New API: optimize({data, path, map}, callback) */
  const optimizerArgs = optimizer.optimize.length === 2 ?
    [params] : [data, path];

  return promisify(optimizer.optimize)
    .apply(optimizer, optimizerArgs)
    .then(optimized => {
      const isObj = toString.call(optimized) === '[object Object]';
      const optimizedCode = isObj ? optimized.data : optimized;
      const optimizedMap = isObj ? optimized.map : null;
      let newMap;
      if (optimizedMap != null) {
        newMap = SourceMapGenerator.fromSourceMap(new SourceMapConsumer(optimizedMap));
        if (newMap._sourcesContents == null) newMap._sourcesContents = {};
        sourceFiles.forEach(arg => {
          const path = arg.path;
          const source = arg.source;
          newMap._sourcesContents["$" + path] = source;
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
  const params = {
    data: data,
    code: data,
    map: map,
    path: path,
    sourceFiles: sourceFiles
  };
  return Promise.resolve(optimizers)
    .then(optimizers => {
      return optimizers.reduce(optimizerChain, params)
    });
};

const jsTypes = ['javascript', 'template'];

const generate = (path, sourceFiles, config, optimizers) => {
  const type = sourceFiles.some(file => jsTypes.indexOf(file.type) >= 0) ?
    'javascript' : 'stylesheet';
  const foptim = optimizers.filter(optimizer => optimizer.type === type);
  const len = config.paths["public"].length + 1;
  const joinKey = path.slice(len);
  const joinToValue = config.files[type + "s"].joinTo[joinKey];
  const sorted = sort(sourceFiles, config, joinToValue);
  const cc = concat(sorted, path, type, config._normalized.modules.definition, config._normalized.packageInfo.component.aliases, config._normalized.modules.autoRequire[joinKey]);
  const code = cc.code;
  const map = cc.map;
  const withMaps = map && config.sourceMaps;
  const mapPath = path + ".map";
  return optimize(code, map, path, foptim, sourceFiles)
    .then(data => {
      if (withMaps) {
        const mapRoute = config.sourceMaps === 'absoluteUrl' ? slashes(mapPath.replace(config.paths["public"], '')) : basename(mapPath);
        const controlChar = config.sourceMaps === 'old' ? '@' : '#';
        data.code += type === 'javascript' ? "\n//" + controlChar + " sourceMappingURL=" + mapRoute : "\n/*" + controlChar + " sourceMappingURL=" + mapRoute + "*/";
      }
      return data;
    }, error => {
      return Promise.reject(error);
    })
    .then(data => {
      common.writeFile(path, data.code);
      return data;
    })
    .then(data => {
      if (withMaps) {
        common.writeFile(mapPath, data.map.toString());
      }
      return data;
    });
};

generate.sortByConfig = sortByConfig;

module.exports = generate;
