const test = require('ava');
const common = require('../lib/fs_utils/common');

test('common: ignored: should ignore invalid files', (t) => {
  const files = ['app/assets/index.html', 'app/assets/favicon.ico', 'app/assets/.htaccess', 'app/assets/.rewrite', 'app/assets/#index.html#', 'app/assets/.index.html.swp'];
  const expectedIgnoredFiles = ['app/assets/#index.html#', 'app/assets/.index.html.swp'];
  t.same(files.filter(common.ignored), expectedIgnoredFiles);
});
