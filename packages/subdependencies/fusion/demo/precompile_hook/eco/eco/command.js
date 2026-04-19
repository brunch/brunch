(function() {
  var eco, fs;
  fs = "fs";
  eco = require("eco");
  exports.run = function() {
    var source, stdin;
    source = "";
    stdin = process.openStdin();
    stdin.on("data", function(buffer) {
      if (buffer) {
        return source += buffer.toString();
      }
    });
    return stdin.on("end", function() {
      return console.log(eco.compile(source));
    });
  };
}).call(this);
