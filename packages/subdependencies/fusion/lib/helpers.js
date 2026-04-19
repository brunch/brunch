(function() {
  var capitalize;
  exports.printLine = function(line) {
    return process.stdout.write(line + '\n');
  };
  capitalize = function(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  };
  exports.underscoreToCamelCase = function(input) {
    var word, words;
    words = input.split("_");
    words = [words[0]].concat((function() {
      var _i, _len, _ref, _results;
      _ref = words.slice(1, words.length);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        word = _ref[_i];
        _results.push(capitalize(word));
      }
      return _results;
    })());
    return words.join('');
  };
}).call(this);
