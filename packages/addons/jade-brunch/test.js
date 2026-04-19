'use strict';

const expect = require('chai').expect;
const Plugin = require('./');
const jade = require('jade');
const sysPath = require('path');
const fs = require('fs');

describe('Plugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new Plugin({paths: {root: '.'}});
  });

  it('should be an object', () => {
    expect(plugin).to.be.ok;
  });

  it('should has #compile method', () => {
    expect(plugin.compile).to.be.an.instanceof(Function);
  });

  it('should compile and produce valid result', () => {
    const content = 'doctype html';
    const expected = '<!DOCTYPE html>';

    return plugin.compile({data: content, path: 'template.jade'}).then(data => {
      expect(eval(data)()).to.equal(expected);
    }, error => expect(error).not.to.be.ok);
  });

  it('should compile template string with data', () => {
    const expected = '<!DOCTYPE html>' +
      '<html lang="en">' +
      '<title>Brunch is awesome!</title>' +
      '</html>';
    const staticContent = 'doctype html' +
      '\nhtml(lang="en")' +
      '\n title #{title}';

    plugin = new Plugin({
      paths: {
        root: '.'
      },
      plugins: {
        jade: {
          locals: {
            title: 'Brunch is awesome!'
          }
        }
      }
    });

    return plugin.compileStatic({data: staticContent, path: 'template.jade'}).then(data => {
      expect(data).to.equal(expected);
    }, error => expect(error).not.to.be.ok);
  });

  describe('runtime', () => {

    it('should include jade/runtime.js', () => {
      expect(plugin.include).to.match(/jade\/runtime\.js$/);
    });

    it('jade/runtime.js should exist', () => {
      expect(fs.existsSync(plugin.include[0])).to.be.ok;
    });

  });


  describe('getDependencies', () => {
    it('should output valid deps', done => {
      const content = "\
include valid1\n\
include valid1.jade\n\
include ../../test/valid1\n\
include ../../test/valid1.jade\n\
include /valid3\n\
extends valid2\n\
extends valid2.jade\n\
include ../../test/valid2\n\
include ../../test/valid2.jade\n\
extends /valid4\n\
";

      const expected = [
        sysPath.join('valid1.jade'),
        sysPath.join('app', 'valid3.jade'),
        sysPath.join('valid2.jade'),
        sysPath.join('app', 'valid4.jade'),
      ];

      // progeny now only outputs actually found files by default
      fs.mkdirSync('app');
      expected.forEach(file => {
        fs.writeFileSync(file, 'div');
      });

      plugin.getDependencies(content, 'template.jade', (error, dependencies) => {
        expect(error).not.to.be.ok;
        expect(dependencies).to.have.members(expected);

        // clean up temp fixture files
        expected.forEach(function(file) {
          fs.unlinkSync(file);
        });
        fs.rmdirSync('app');

        done();
      });
    });
  });

  describe('getDependenciesWithOverride', () => {
    it('should output valid deps', done => {

      const content = "\
include /valid3\n\
extends /valid4\n\
";

      const expected = [
        sysPath.join('custom', 'valid3.jade'),
        sysPath.join('custom', 'valid4.jade'),
      ];

      // progeny now only outputs actually found files by default
      fs.mkdirSync('custom');
      expected.forEach(file => {
        fs.writeFileSync(file, 'div');
      });

      plugin = new Plugin({paths: {root: '.'}, plugins: {jade: {basedir: 'custom'}}});

      plugin.getDependencies(content, 'template.jade', (error, dependencies) => {
        expect(error).not.to.be.ok;
        expect(dependencies).to.have.members(expected);

        // clean up temp fixture files
        expected.forEach(file => {
          fs.unlinkSync(file);
        });
        fs.rmdirSync('custom');

        done();
      });
    });
  });

});
