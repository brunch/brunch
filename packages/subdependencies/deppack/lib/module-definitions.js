'use strict';

const simpleDef = (name, exp) => {
  return `require.register("${name}", function(exports, require, module) {
  ${exp}
});`;
};

const definition = (name, exp) => {
  return simpleDef(name, `module.exports = ${exp};`);
};

const aliasDef = (target, source) => `require.alias("${source}", "${target}");`;
const simpleShimDef = (name, obj) => definition(name, JSON.stringify(obj));

const makeRequire = (
`\nvar __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};
`);

module.exports = {aliasDef, simpleDef, simpleShimDef, definition, makeRequire};
