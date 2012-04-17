common = require './common'
helpers = require '../helpers'
logger = require '../logger'

# The definition would be added on top of every filewriter .js file.
requireDefinition = '''
(function(/*! Brunch !*/) {
  'use strict';

  if (!this.require) {
    var modules = {};
    var cache = {};
    var amdModules = {};
    var __hasProp = ({}).hasOwnProperty;

    var expand = function(root, name) {
      var results = [], parts, part;
      if (/^\\.\\.?(\\/|$)/.test(name)) {
        parts = [root, name].join('/').split('/');
      } else {
        parts = name.split('/');
      }
      for (var i = 0, length = parts.length; i < length; i++) {
        part = parts[i];
        if (part == '..') {
          results.pop();
        } else if (part != '.' && part != '') {
          results.push(part);
        }
      }
      return results.join('/');
    };

    var getFullPath = function(path, fromCache) {
      var store = fromCache ? cache : modules;
      var dirIndex;
      if (__hasProp.call(store, path)) return path;
      dirIndex = expand(path, './index');
      if (__hasProp.call(store, dirIndex)) return dirIndex;
    };
    
    var cacheModule = function(name, path, contentFn) {
      var module = {id: path, exports: {}};
      try {
        cache[path] = module.exports;
        contentFn(module.exports, function(name) {
          return require(name, dirname(path));
        }, module);
        cache[path] = module.exports;
      } catch (err) {
        delete cache[path];
        throw err;
      }
      return cache[path];
    };

    var require = function(name, root) {
      var path = expand(root, name);
      var fullPath;

      if (__hasProp.call(amdModules, name)) {
        delete amdModules[name];
        delete cache[name];
      }

      if (fullPath = getFullPath(path, true)) {
        return cache[fullPath];
      } else if (fullPath = getFullPath(path, false)) {
        return cacheModule(name, fullPath, modules[fullPath]);
      } else {
        throw new Error("Cannot find module '" + name + "'");
      }
    };

    var dirname = function(path) {
      return path.split('/').slice(0, -1).join('/');
    };

    this.require = function(name) {
      return require(name, '');
    };

    var defineModule = function(name, fn) {
      return modules[name] = fn;
    };

    var defineModules = function(bundle) {
      for (var key in bundle) {
        if (__hasProp.call(bundle, key)) {
          defineModule(key, bundle[key]);
        }
      }
    };

    var defineAMD = function(name, deps, fn) {
      var loadedDeps = [];
      for (var i = 0, length = deps.length; i < length; i++) {
        loadedDeps.push(require(deps[i]));
      }
      var module = function(exports, require, module) {
        module.exports = fn.apply(this, loadedDeps);
      };
      defineModule(name, module);
      amdModules[name] = module;
    };

    this.define = function(bundle) {
      if (typeof bundle === 'object') {
        defineModules(bundle);
      } else if (arguments[2] == null) {
        defineModule(arguments[0], arguments[1]);
      } else {
        defineAMD.apply(this, arguments);
      }
    };

    this.require.define = this.define;
    this.define.brunch = true;
    this.define.amd = {
      jQuery: true
    };
  }
}).call(this);


'''

sortAlphabetically = (a, b) ->
  if a < b
    -1
  else if a > b
    1
  else
    0

# If item path starts with 'vendor', it has bigger priority.
# TODO: check for config.vendorPath
sortByVendor = (config, a, b) ->
  vendorPath = 'vendor'
  aIsVendor = helpers.startsWith a, vendorPath
  bIsVendor = helpers.startsWith a, vendorPath
  if aIsVendor and not bIsVendor
    -1
  else if not aIsVendor and bIsVendor
    1
  else
    # All conditions were false, we don't care about order of
    # these two items.
    sortAlphabetically a, b

# Items wasn't found in config.before, try to find then in
# config.after.
# Item that config.after contains would have lower sorting index.
sortByAfter = (config, a, b) ->
  indexOfA = config.after.indexOf a
  indexOfB = config.after.indexOf b
  [hasA, hasB] = [(indexOfA isnt -1), (indexOfB isnt -1)]
  if hasA and not hasB
    1
  else if not hasA and hasB
    -1
  else if hasA and hasB
    indexOfA - indexOfB
  else
    sortByVendor config, a, b

# Try to find items in config.before.
# Item that config.after contains would have bigger sorting index.
sortByBefore = (config, a, b) ->
  indexOfA = config.before.indexOf a
  indexOfB = config.before.indexOf b
  [hasA, hasB] = [(indexOfA isnt -1), (indexOfB isnt -1)]
  if hasA and not hasB
    -1
  else if not hasA and hasB
    1
  else if hasA and hasB
    indexOfA - indexOfB
  else
    sortByAfter config, a, b

# Sorts by pattern.
# 
# Examples
#
#   sort ['b.coffee', 'c.coffee', 'a.coffee'],
#     before: ['a.coffee'], after: ['b.coffee']
#   # => ['a.coffee', 'c.coffee', 'b.coffee']
# 
# Returns new sorted array.
sortByConfig = (files, config) ->
  return files if typeof config isnt 'object'
  config.before ?= []
  config.after ?= []
  # Clone data to a new array.
  files.slice().sort (a, b) -> sortByBefore config, a, b

# File which is generated by brunch from other files.
module.exports = class GeneratedFile
  # 
  # path        - path to file that will be generated.
  # sourceFiles - array of `fs_utils.SourceFile`-s.
  # config      - parsed application config.
  # 
  constructor: (@path, @sourceFiles, @config) ->    
    @type = if @sourceFiles.some((file) -> file.type is 'javascript')
      'javascript'
    else
      'stylesheet'

  _extractOrder: (files, config) ->
    types = files.map (file) -> helpers.pluralize file.type
    Object.keys(config.files)
      .filter (key) ->
        key in types
      # Extract order value from config.
      .map (key) ->
        config.files[key].order
      # Join orders together.
      .reduce (memo, array) ->
        array or= {}
        {
          before: memo.before.concat(array.before or []),
          after: memo.after.concat(array.after or [])
        }
      , {before: [], after: []}

  # Private: Collect content from a list of files and wrap it with
  # require.js module definition if needed.
  # Returns string.
  _joinSourceFiles: ->
    files = @sourceFiles
    paths = files.map (file) -> file.path
    order = @_extractOrder files, @config
    sourceFiles = (sortByConfig paths, order).map (file) ->
      files[paths.indexOf file]
    sortedPaths = sourceFiles.map((file) -> file.path).join(', ')
    logger.debug "Writing files '#{sortedPaths}' to '#{@path}'"
    data = ''
    data += requireDefinition if @type is 'javascript'
    data += sourceFiles.map((file) -> file.data).join('')
    data

  # Private: minify data.
  # 
  # data     - string of js / css that will be minified.
  # callback - function that would be executed with (minifyError, data).
  # 
  # Returns nothing.
  _minify: (data, callback) ->
    if @config.minify and @minifier?.minify?
      @minifier.minify data, @path, callback
    else
      callback null, data

  # Joins data from source files, minifies it and writes result to 
  # path of current generated file.
  # 
  # callback - minify / write error or data of written file.
  # 
  # Returns nothing.
  write: (callback) ->
    @_minify @_joinSourceFiles(), (error, data) =>
      return callback error if error?
      common.writeFile @path, data, callback
