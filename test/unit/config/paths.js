'use strict';
const {paths} = require('./_norm');

describe('config.paths', () => {
  it('has defaults', () => {
    paths().should.eql({
      root: '.',
      public: 'public',
      watched: ['app', 'test'],
      packageConfig: 'package.json',
    });
  });

  describe('watched', () => {
    it('allows single string', () => {
      paths.watched('a').should.eql(['a']);
    });

    it('bans duplicates', () => {
      (() => {
        paths({
          watched: ['a', 'a'],
        });
      }).should.throw();
    });
  });

  describe('relative paths', () => {
    it('joins with `root`', () => {
      paths({
        root: 'a',
      }).should.eql({
        root: 'a',
        public: 'a/public',
        watched: ['a/app', 'a/test'],
        packageConfig: 'a/package.json',
      });
    });

    it('normalizes', () => {
      paths({
        public: 'b\\c\\.',
        watched: ['./a'],
        packageConfig: 'd/e\\..',
      }).should.eql({
        root: '.',
        public: 'b/c',
        watched: ['a'],
        packageConfig: 'd',
      });
    });

    it('trims trailing slashes', () => {
      paths({
        root: 'a/',
        public: 'd/',
        watched: ['b\\', 'c/'],
        packageConfig: 'e\\',
      }).should.eql({
        root: 'a',
        public: 'a/d',
        watched: ['a/b', 'a/c'],
        packageConfig: 'a/e',
      });
    });
  });

  describe('absolute paths', () => {
    it('preserves as is', () => {
      paths({
        root: 'a',
        public: __dirname,
        watched: [__dirname],
        packageConfig: __filename,
      }).should.eql({
        root: 'a',
        public: __dirname,
        watched: [__dirname],
        packageConfig: __filename,
      });
    });

    it('normalizes', () => {
      paths({
        public: `${__dirname}\\a\\..`,
        watched: [`${__dirname}/.`],
        packageConfig: `${__filename}\\./b`,
      }).should.eql({
        root: '.',
        public: __dirname,
        watched: [__dirname],
        packageConfig: `${__filename}/b`,
      });
    });

    it('trims trailing slashes', () => {
      paths({
        public: `${__dirname}\\`,
        watched: [`${__dirname}/`],
        packageConfig: `${__filename}/`,
      }).should.eql({
        root: '.',
        public: __dirname,
        watched: [__dirname],
        packageConfig: __filename,
      });
    });
  });
});
