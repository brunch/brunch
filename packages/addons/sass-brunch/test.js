/* eslint-env mocha */
'use strict';

const expect = require('chai').expect;
const Plugin = require('./');
const sysPath = require('path');
const fs = require('fs');

describe('sass-brunch plugin using', function() {
  runTests.call(this, {
    mode: 'dart-sass',
    compress(s) {
      return `${s.replace(/[\s;]*/g, '')}\n\n`;
    },
  });
});

// eslint-disable-next-line
function runTests(settings) {
  const mode = settings.mode;
  const compress = settings.compress || (s => s);

  describe(mode, () => {
    let plugin;
    let config;
    const fileName = 'app/styles/style.scss';

    beforeEach(() => {
      config = Object.freeze({
        paths: {root: '.'},
        optimize: true,
        plugins: {
          sass: {
            mode,
          },
        },
      });
      plugin = new Plugin(config);
    });

    it('should be an object', () => {
      expect(plugin).to.be.ok;
    });

    it('should have a #compile method', () => {
      expect(plugin.compile).to.be.an.instanceof(Function);
    });

    it('should compile and produce valid result for scss', () => {
      const content = '$a: 5px; .test {\n  border-radius: $a; }\n';
      const expected = '.test {\n  border-radius: 5px; }\n';

      return plugin.compile({data: content, path: 'file.scss'})
        .then(
          data => expect(data.data).to.equal(compress(expected)),
          error => expect(error).not.to.be.ok
        );
    });

    it('should default to ten decimals of precision for scss', () => {
      const content = '$a: 5px; .test {\n  border-radius: $a/3; }\n';
      const expected = '1.6666666667px';

      return plugin.compile({data: content, path: 'file.scss'})
        .then(
          data => expect(data.data).to.contain(expected),
          error => expect(error).not.to.be.ok
        );
    });

    it('should compile and produce valid result for sass', () => {
      const content = '$a: 5px\n.test\n  border-radius: $a';
      const expected = '.test {\n  border-radius: 5px; }\n';

      return plugin.compile({data: content, path: 'file.sass'})
        .then(
          data => expect(data.data).to.equal(compress(expected)),
          error => expect(error).not.to.be.ok
        );
    });

    it('should default to ten decimals of precision for sass', () => {
      const content = '$a: 5px\n.test\n  border-radius: $a/3';
      const expected = '1.6666666667px';

      return plugin.compile({data: content, path: 'file.sass'})
        .then(
          data => expect(data.data).to.contain(expected),
          error => expect(error).not.to.be.ok
        );
    });

    function convertBackslashes(path){
      return sysPath.sep === '\\' ? path.replace(/\\/g, '/') : file;
    }

    it('should output valid deps', done => {
      const content = `
      @import 'valid1';
      @import '../../vendor/styles/valid3';
      @import '../../app/styles/globbed/*';
      `;

      fs.mkdirSync('app');
      fs.mkdirSync('vendor');
      fs.mkdirSync(sysPath.join('app', 'styles'));
      fs.mkdirSync(sysPath.join('app', 'styles', 'globbed'));
      fs.mkdirSync(sysPath.join('vendor', 'styles'));
      fs.writeFileSync(sysPath.join('app', 'styles', '_valid1.sass'), '@import "./valid2.scss";');
      fs.writeFileSync(sysPath.join('app', 'styles', 'valid2.scss'), '\n');
      fs.writeFileSync(sysPath.join('vendor', 'styles', '_valid3.scss'), '\n');
      fs.writeFileSync(sysPath.join('app', 'styles', 'globbed', '_globbed1.sass'), '\n');
      fs.writeFileSync(sysPath.join('app', 'styles', 'globbed', '_globbed2.sass'), '\n');

      const expected = [
        sysPath.join('app', 'styles', '_valid1.sass'),
        sysPath.join('app', 'styles', 'valid2.scss'),
        sysPath.join('vendor', 'styles', '_valid3.scss'),
        sysPath.join('app', 'styles', 'globbed', '_globbed1.sass'),
        sysPath.join('app', 'styles', 'globbed', '_globbed2.sass'),
      ].map(convertBackslashes);

      plugin.getDependencies(content, fileName, (error, dependencies) => {
        fs.unlinkSync(sysPath.join('app', 'styles', 'globbed', '_globbed1.sass'));
        fs.unlinkSync(sysPath.join('app', 'styles', 'globbed', '_globbed2.sass'));
        fs.unlinkSync(sysPath.join('app', 'styles', '_valid1.sass'));
        fs.unlinkSync(sysPath.join('app', 'styles', 'valid2.scss'));
        fs.unlinkSync(sysPath.join('vendor', 'styles', '_valid3.scss'));
        fs.rmdirSync(sysPath.join('app', 'styles', 'globbed'));
        fs.rmdirSync(sysPath.join('app', 'styles'));
        fs.rmdirSync(sysPath.join('vendor', 'styles'));
        fs.rmdirSync('app');
        fs.rmdirSync('vendor');

        expect(error).not.to.be.ok;
        const dependenciesConverted = dependencies.map(convertBackslashes);

        expect(dependenciesConverted.length).to.eql(expected.length);

        expected.forEach(item =>
          expect(dependenciesConverted.indexOf(item)).to.be.greaterThan(-1)
        );

        done();
      });
    });

    it('should return empty result for empty source', () => {
      const content = '   \t\n';
      const expected = '';

      return plugin.compile({data: content, path: 'file.scss'})
        .then(
          data => expect(data.data).to.equal(expected),
          error => expect(error).not.to.be.ok
        );
    });

    it('should save without error', () => {
      const content = `
        $var: () !default;
        @function test($value) {
          @if index($var, $value) {
            @return false;
          }
          $var: append($var, $value) !global;
          @return true;
        }`;
      const expected = '';


      return plugin.compile({data: content, path: 'no-content.scss'})
        .then(
          data => expect(data.data.trim()).to.equal(expected),
          error => expect(error).not.to.be.ok
        );
    });

    it('should compile with modules', () => {
      const content = '.class {color: #6b0;}';
      const expected = /^\._class_/;

      const newPlugin = new Plugin({
        paths: {root: '.'},
        plugins: {
          sass: {
            mode,
            modules: true,
          },
        },
      });

      return newPlugin.compile({data: content, path: 'file.scss'})
        .then(
          result => expect(result.data).to.match(expected),
          error => expect(error).not.to.be.ok
        );
    });

    it('should skip modulifying files passed to ignore', () => {
      const content = '.class {color: #6b0;}';
      const expected = /^\.class \{/;

      const newPlugin = new Plugin({
        paths: {root: '.'},
        plugins: {
          sass: {
            mode,
            modules: {ignore: [/file\.scss/]},
          },
        },
      });

      return newPlugin.compile({data: content, path: 'file.scss'})
        .then(
          result => expect(result.data).to.match(expected),
          error => expect(error).not.to.be.ok
        );
    });
  });
}

describe('sass-brunch plugin using native', () => {
  const compress = str => `${str.replace(/[\s;]*/g, '')}\n\n`;

  it(`should import files via glob`, () => {
    const sassContent = '.something\n  background: red';
    const scssContent = '.something-else {\n  background: blue;\n}';
    const content = '@import "./sub_dir/*"';

    const expected = '.something {\n  background: red; }\n\n.something-else {\n  background: blue; }\n\n';

    fs.mkdirSync('app');
    fs.mkdirSync(sysPath.join('app', 'styles'));
    fs.mkdirSync(sysPath.join('app', 'styles', 'sub_dir'));
    fs.writeFileSync(sysPath.join('app', 'styles', 'sub_dir', '_glob1.sass'), sassContent);
    fs.writeFileSync(sysPath.join('app', 'styles', 'sub_dir', '_glob2.scss'), scssContent);

    const newPlugin = new Plugin({
      paths: {root: '.'},
      sourceMapEmbed: false,
      plugins: {
        sass: {
          modules: false,
        },
      },
    });

    const cleanFixtures = () => {
      fs.unlinkSync(sysPath.join('app', 'styles', 'sub_dir', '_glob1.sass'));
      fs.unlinkSync(sysPath.join('app', 'styles', 'sub_dir', '_glob2.scss'));
      fs.rmdirSync(sysPath.join('app', 'styles', 'sub_dir'));
      fs.rmdirSync(sysPath.join('app', 'styles'));
      fs.rmdirSync('app');
    };

    newPlugin.compile({data: content, path: './app/styles/file.sass'})
      .then(
        result => expect(result.data).to.equal(expected),
        error => expect(error).not.to.be.ok
      )
      .then(
        result => cleanFixtures(),
        error => cleanFixtures()
      );
  });

  describe('with experimental custom functions', () => {
    const SassNumber = require('sass').types.Number;

    it('should invoke the functions for scss', () => {
      const config = Object.freeze({
        paths: {root: '.'},
        optimize: true,
        plugins: {
          sass: {
            mode: 'native',
            functions: {
              'pow($val, $exp)': (val, exp) => new SassNumber(
                Math.pow(val.getValue(), exp.getValue()),
                val.getUnit()
              ),
            },
          },
        },
      });
      const plugin = new Plugin(config);

      const content = '.test {\n  border-radius: pow(2px,10); }\n';
      const expected = '.test {\n  border-radius: 1024px; }\n';

      return plugin.compile({data: content, path: 'file.scss'})
        .then(
          data => expect(data.data).to.equal(compress(expected)),
          error => expect(error).not.to.be.ok
        );
    });

    it('should invoke the functions for sass', () => {
      const config = Object.freeze({
        paths: {root: '.'},
        optimize: true,
        plugins: {
          sass: {
            mode: 'native',
            functions: {
              'pow($val, $exp)': (val, exp) => new SassNumber(
                Math.pow(val.getValue(), exp.getValue()),
                val.getUnit()
              ),
            },
          },
        },
      });
      const plugin = new Plugin(config);

      const content = '.test \n  border-radius: pow(2px,10)\n';
      const expected = '.test {\n  border-radius: 1024px; }\n';

      return plugin.compile({data: content, path: 'file.sass'})
        .then(
          data => expect(data.data).to.equal(compress(expected)),
          error => expect(error).not.to.be.ok
        );
    });
  });
});
