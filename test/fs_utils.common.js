var common;

common = require('../lib/fs_utils/common');

describe('common', function() {
  return describe('ignored()', function() {
    return it('should ignore invalid files', function() {
      var expectedIgnoredFiles, files;
      files = ['app/assets/index.html', 'app/assets/favicon.ico', 'app/assets/.htaccess', 'app/assets/.rewrite', 'app/assets/#index.html#', 'app/assets/.index.html.swp'];
      expectedIgnoredFiles = ['app/assets/#index.html#', 'app/assets/.index.html.swp'];
      return expect(files.filter(common.ignored)).to.eql(expectedIgnoredFiles);
    });
  });
});
