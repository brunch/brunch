(function() {
  var exec;
  exec = require('child_process').exec;
  exports.copy = function(source, target) {
    return exec('cp -R ' + source + ' ' + target, function(error, stdout, stderr) {
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        console.log(stderr);
      }
      if (error) {
        return console.log(error);
      }
    });
  };
}).call(this);
