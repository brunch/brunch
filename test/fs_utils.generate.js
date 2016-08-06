'use strict';
const test = require('ava');
const generate = require('../lib/fs_utils/generate');

test('should files by config.before', t => {
  const files = ['backbone.js', 'jquery.js', 'underscore.js'];
  const config = {before: ['jquery.js', 'underscore.js', 'backbone.js']};
  t.deepEqual(generate.sortByConfig(files, config), config.before);
});

test('should files by config.after', t => {
  const files = ['helper-1.js', 'backbone.js', 'helper-2.js'];
  const config = {after: ['helper-1.js', 'helper-2.js']};
  t.deepEqual(generate.sortByConfig(files, config), ['backbone.js', 'helper-1.js', 'helper-2.js']);
});

test('should files by config.vendor', t => {
  const files = ['vendor/backbone.js', 'jquery.js', 'meh/underscore.js'];
  const config = {
    vendorConvention: path => {
      return /^(meh|vendor)/.test(path);
    }
  };
  t.deepEqual(generate.sortByConfig(files, config), ['meh/underscore.js', 'vendor/backbone.js', 'jquery.js']);
});

test('should files alphabetically', t => {
  const files = ['z', 'e', 'a', 'd', 'c', 's', 'z'];
  const config = {};
  t.deepEqual(generate.sortByConfig(files, config), ['a', 'c', 'd', 'e', 's', 'z', 'z']);
});

test('should sort files by config correctly', t => {
  const files = ['a', 'b', 'c', 'vendor/5', 'vendor/4', 'd', 'vendor/1', 'vendor/3', 'vendor/6', 'e', 'vendor/2'];
  const config = {
    before: ['vendor/1', 'vendor/2', 'vendor/3', 'vendor/4', 'vendor/5'],
    after: ['b'],
    vendorConvention: path => {
      return /vendor\//.test(path);
    }
  };
  const res = ['vendor/1', 'vendor/2', 'vendor/3', 'vendor/4', 'vendor/5', 'vendor/6', 'a', 'c', 'd', 'e', 'b'];
  t.deepEqual(generate.sortByConfig(files, config), res);
});
