'use strict';
const {expect} = require('chai');
const generate = require('../lib/fs_utils/generate');
const isIgnored = require('../lib/fs_utils/is_ignored');

describe('fs_utils.generate generation', () => {
  it('files by config.before', () => {
    const files = ['backbone.js', 'jquery.js', 'underscore.js'];
    const config = {before: ['jquery.js', 'underscore.js', 'backbone.js']};
    expect(generate.sortByConfig(files, config)).to.deep.equal(config.before);
  });

  it('files by config.after', () => {
    const files = ['helper-1.js', 'backbone.js', 'helper-2.js'];
    const config = {after: ['helper-1.js', 'helper-2.js']};
    expect(generate.sortByConfig(files, config)).to.deep.equal([
      'backbone.js', 'helper-1.js', 'helper-2.js'
    ]);
  });

  it('files by config.vendor', () => {
    const files = ['vendor/backbone.js', 'jquery.js', 'meh/underscore.js'];
    const config = {
      vendorConvention: path => {
        return /^(meh|vendor)/.test(path);
      },
    };
    expect(generate.sortByConfig(files, config)).to.deep.equal([
      'meh/underscore.js', 'vendor/backbone.js', 'jquery.js'
    ]);
  });

  it('files alphabetically', () => {
    const files = ['z', 'e', 'a', 'd', 'c', 's', 'z'];
    const config = {};
    expect(generate.sortByConfig(files, config)).to.deep.equal([
      'a', 'c', 'd', 'e', 's', 'z', 'z'
    ]);
  });

  it('sorts files by config correctly', () => {
    const files = ['a', 'b', 'c', 'vendor/5', 'vendor/4', 'd', 'vendor/1', 'vendor/3', 'vendor/6', 'e', 'vendor/2'];
    const config = {
      before: ['vendor/1', 'vendor/2', 'vendor/3', 'vendor/4', 'vendor/5'],
      after: ['b'],
      vendorConvention: path => {
        return /vendor\//.test(path);
      },
    };
    const res = ['vendor/1', 'vendor/2', 'vendor/3', 'vendor/4', 'vendor/5', 'vendor/6', 'a', 'c', 'd', 'e', 'b'];
    expect(generate.sortByConfig(files, config)).to.deep.equal(res);
  });
});

describe('fs_utils.is_ignored', () => {
  it('ignores invalid files', () => {
    const files = ['app/assets/index.html', 'app/assets/favicon.ico', 'app/assets/.htaccess', 'app/assets/.rewrite', 'app/assets/#index.html#', 'app/assets/.index.html.swp'];
    const expectedIgnoredFiles = ['app/assets/#index.html#', 'app/assets/.index.html.swp'];
    expect(files.filter(isIgnored)).to.deep.equal(expectedIgnoredFiles);
  });
});
