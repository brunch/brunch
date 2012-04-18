(function(/*! Brunch !*/) {
  if (typeof window.define !== 'undefined') return;

  var modules = {};
  var cache = {};
  var needsClear = {};

  var getClass = function(item) {
    return ({}).toString.call(item).replace('[object ', '').replace(']', '');
  };

  var hasProp = function(object, name) {
    return ({}).hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
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

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var initModule = function(name, fn) {
    console.log('Init module', name)
    var module = {id: name, exports: {}};
    var result = fn(
      localRequire(name), module.exports, module, localDefine(name)
    );
    if (!(name in needsClear)) cache[name] = result;
    console.log('Cached', name, result, module.exports);
    return result;
  };

  var clearCache = function(name) {
    delete cache[name];
    delete needsClear[name];
  };

  var getModule = function(name) {
    var path = expand(name, '.');
    if (path in needsClear) clearCache(path);

    if (hasProp(cache, path)) return cache[path];
    if (hasProp(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (hasProp(cache, dirIndex)) return cache[dirIndex];
    if (hasProp(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '"');
  };

  var getModules = function(names) {
    var loaded = [];
    for (var i = 0, length = names.length; i < length; i++) {
      loaded.push(getModule(names[i]));
    }
    return loaded;
  };

  var defineModule = function(name, fn) {
    console.log('Define module', name)
    modules[name] = fn;
    return fn;
  };

  var defineModules = function(names) {
    for (var key in names) {
      if (hasProp(names, key)) {
        defineModule(key, names[key]);
      }
    }
  };

  var require = function(first, second) {
    if (getClass(first) === 'String') {
      return getModule(first);
    } else if (getClass(first) === 'Array' && getClass(second) === 'Function') {
      return second(getModules(first));
    } else {
      throw new Error('Invalid require syntax');
    }
  };

  var localRequire = function(name) {
    return function(path) {
      var fullPath = expand(dirname(name), path);
      return require(fullPath);
    };
  };

  var define = function(first, second, third) {
    console.log('define', first);
    if (getClass(first) === 'String') {
      if (getClass(second) === 'Array') {
        defineModule(first, third.apply(this, getModules(second)));
      } else if (getClass(second) === 'Function') {
        defineModule(first, second);
      }
    } else if (getClass(first) === 'Object') {
      defineModules(first);
    } else {
      throw new Error('Invalid define syntax');
    }
  };

  var localDefine = function(name) {
    var closure = function(first, second, third) {
      console.log('localDefine', name)
      var deps, fn;
      if (getClass(first) === 'Function') {
        deps = [];
        fn = first;
      } else if (getClass(first) === 'Array' && getClass(second) === 'Function') {
        deps = first;
        fn = second;
      } else {
        name = first;
        deps = second;
        fn = third;
      }
      define(name, deps, function() {
        return fn;
      });
      needsClear[name] = true;
    };
    closure.amd = define.amd;
    return closure;
  };

  define.amd = {
    brunch: true,
    jQuery: true
  };

  define.require = require;

  var globals = typeof window !== 'undefined' ? window : global;
  globals.require = require;
  globals.define = define;
})();
