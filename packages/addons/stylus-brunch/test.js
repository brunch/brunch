/* eslint no-undef: 0 */
'use strict';

const expect = require('chai').expect;
const Plugin = require('./');
const fs = require('fs');
const sysPath = require('path');
const fixturesPath = sysPath.resolve(__dirname, 'fixtures');

describe('Plugin', () => {
  let plugin;
  const path = 'fixtures/app/styles/style.styl';

  beforeEach(() => {
    plugin = new Plugin({
      paths: {
        root: '',
      },
      plugins: {
        stylus: {
          paths: [fixturesPath],
          defines: {
            url: require('stylus').url(),
          },
        },
      },
    });
  });

  it('should be an object', () => {
    expect(plugin).to.be.an('object');
  });

  describe('#compile', () => {
    it('should have #compile method', () => {
      expect(plugin).to.respondTo('compile');
    });

    it('should compile and produce valid result', () => {
      const imagePath = './dot.jpg';
      const base64 = fs.readFileSync(`${fixturesPath}/${imagePath}`).toString('base64');

      const data = `body\n  font: 12px Helvetica, Arial, sans-serif\n  background: url("${imagePath}")`;
      const expected = `body {\n  font: 12px Helvetica, Arial, sans-serif;\n  background: url("data:image/jpeg;base64,${base64}");\n}\n`;

      return plugin.compile({data, path}).then(result => {
        expect(result.data).to.equal(expected);
      });
    });

    it('should compile and import from config.stylus.paths', () => {
      const data = "@import 'path_test'\n";
      const expected = '.test {\n  color: #fff;\n}\n';

      return plugin.compile({data, path}).then(result => {
        expect(result.data).to.equal(expected);
      });
    });

    it('should throw error in correct format', () => {
      const data = ">";
      const expected = `L1:2 \n   1| >
-------^\n
expected "indent", got "eos"\n`;

      return plugin.compile({data, path}).catch(error => {
        expect(error.stack).to.be.a('string');
        expect(error.toString()).to.equal(expected);
      });
    });
  });

  describe('getDependencies', () => {
    it('should output valid deps', () => {
      const data = `
        @import unquoted
        @import 'valid1'
        @import '__--valid2--'
        @import "./valid3.styl"
        @import '../../vendor/styles/valid4'
        @import 'nib'
        // @import 'commented'
      `;

      const expected = [
        sysPath.join('fixtures', 'app', 'styles', 'unquoted.styl'),
        sysPath.join('fixtures', 'app', 'styles', 'valid1.styl'),
        sysPath.join('fixtures', 'app', 'styles', '__--valid2--.styl'),
        sysPath.join('fixtures', 'app', 'styles', 'valid3.styl'),
        sysPath.join('fixtures', 'vendor', 'styles', 'valid4.styl'),
      ];

      return plugin.getDependencies({data, path}).then(deps => {
        expect(deps).to.deep.equal(expected);
      });
    });

    it('should match globs', () => {
      const data = '@import styles/*';
      const path = 'fixtures/app/glob_test.styl';

      const expected = [
        sysPath.join('fixtures', 'app', 'styles', 'unquoted.styl'),
        sysPath.join('fixtures', 'app', 'styles', 'valid1.styl'),
        sysPath.join('fixtures', 'app', 'styles', '__--valid2--.styl'),
        sysPath.join('fixtures', 'app', 'styles', 'valid3.styl'),
      ].sort();

      return plugin.getDependencies({data, path}).then(deps => {
        expect(deps.sort()).to.deep.equal(expected);
      });
    });
  });
});


describe('Plugin Import Module', () => {
  const path = 'fixtures/app/styles/style.styl';
  const pluginPath = sysPath.resolve(__dirname, 'fixtures/plugin-import-module/index.js');
  let plugin;

  it('Add plugin import should add fn', () => {
    // import add plugin
    plugin = new Plugin({
      paths: {
        root: '',
      },
      plugins: {
        stylus: {
          plugins: [[pluginPath, 'add']],
        },
      },
    });

    const data = `body\n  top: add(1, 3)`;
    const expected = `body {\n  top: 4;\n}\n`;

    return plugin.compile({data, path}).then(result => {
      expect(result.data).to.equal(expected);
    });
  });

  it('Sub plugin import should sub fn', () => {
    // import add plugin
    plugin = new Plugin({
      paths: {
        root: '',
      },
      plugins: {
        stylus: {
          plugins: [[pluginPath, 'sub']],
        },
      },
    });

    const data = `body\n  top: sub(3, 2)`;
    const expected = `body {\n  top: 1;\n}\n`;

    return plugin.compile({data, path}).then(result => {
      expect(result.data).to.equal(expected);
    });
  });
});


describe('Plugin as a function', () => {
  const path = 'fixtures/app/styles/style.styl';
  it('Compile results and should be prefixed', () => {
    // import add plugin
    const plugin = new Plugin({
      paths: {
        root: '',
      },
      plugins: {
        stylus: {
          plugins: [require('autoprefixer-stylus')({browsers: ['last 99 versions']})],
        },
      },
    });

    const data = `body\n  display: flex`;
    const expected = `body {\n  display: -webkit-box;\n  display: -webkit-flex;\n  display: -moz-box;\n  display: -ms-flexbox;\n  display: flex;\n}\n`;
    return plugin.compile({data, path}).then(result => {
      expect(result.data).to.equal(expected);
    });
  });
});
