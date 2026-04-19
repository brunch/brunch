/* eslint-disable */
/**
 * Created by papostol on 27/01/2015.
 */

Handlebars.initNS = function (ns, obj) {
  var global = (function () {
    return this;
  })(), levels = ns.split('.'), first = levels.shift();
  obj = obj || global;
  obj[first] = obj[first] || {};
  if (levels.length) {
    Handlebars.initNS(levels.join('.'), obj[first]);
  }
  return obj[first];
};
