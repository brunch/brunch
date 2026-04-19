/* eslint-disable */
/**
 * Created by Paul on 10/11/2015.
 */

var sysPath = require('path');
var fs = require('fs');

var dist = sysPath.join(__dirname, 'dist');

if (!fs.existsSync(dist)) {
  fs.mkdirSync(dist);
}

var runtime = ['', '.runtime'], amd = ['', '.amd'], min = ['', '.min'];
var hPath = sysPath.dirname(require.resolve('handlebars'));

runtime.forEach(function(r) {
  amd.forEach(function(a) {
    min.forEach(function(m) {
      var fileName = 'handlebars' + r + a + m + '.js';
      var absFilePath = sysPath.join(hPath, '..', 'dist', fileName);
      var file = sysPath.join(__dirname, 'dist', fileName);
      if (!fs.existsSync(file)) {
        fs.createReadStream(absFilePath).pipe(fs.createWriteStream(file));
      }
    });
  });
});
