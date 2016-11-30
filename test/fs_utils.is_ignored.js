'use strict';
const test = require('ava-no-babel');
const isIgnored = require('../lib/fs_utils/is_ignored');

test('isIgnored: ignored: should ignore invalid files', t => {
  const files = ['app/assets/index.html', 'app/assets/favicon.ico', 'app/assets/.htaccess', 'app/assets/.rewrite', 'app/assets/#index.html#', 'app/assets/.index.html.swp'];
  const expectedIgnoredFiles = ['app/assets/#index.html#', 'app/assets/.index.html.swp'];
  t.deepEqual(files.filter(isIgnored), expectedIgnoredFiles);
});
