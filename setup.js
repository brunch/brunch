var exec = require('child_process').exec;
var sysPath = require('path');

var mode = process.argv[2];

var execute = function(pathParts, params, callback) {
  if (callback == null) callback = function() {};
  var path = sysPath.join.apply(null, pathParts);
  exec('node ' + path + ' ' + params, function(error, stdout, stderr) {
    if (error != null) return console.error('Error', error);
    callback(error, stdout);
  })
};

if (mode === 'compile') {
  execute(['node_modules', 'coffee-script', 'bin', 'coffee'], '-o lib/ src/');
} else if (mode === 'test') {
  execute(['node_modules', 'mocha', 'bin', 'mocha'], '--reporter spec');
}
