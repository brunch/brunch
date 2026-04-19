const add = function(a, b) {
  return a.operate('+', b);
};

const sub = function(a, b) {
  return a.operate('-', b);
};

const addPlugin = function() {
  return function(style) {
    style.define('add', add);
  };
};

const subPlugin = function() {
  return function(style) {
    style.define('sub', sub);
  };
};


// simulates es2015 export export statement
Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.add = addPlugin;
exports.sub = subPlugin;
