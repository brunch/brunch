/* eslint no-undef: 0, no-unused-expressions: 0 */
'use strict';

const expect = require('chai').expect;
const Plugin = require('.');
const FakeFS = require('fake-fs');

describe('Plugin', () => {
  let plugin, pluginCfg;
  const correctData = 'var a = 228;';
  const fileMock = {data: `${correctData};`, path: 'app/file.js'};

  beforeEach(() => {
    pluginCfg = {
      paths: {app: 'app'},
      plugins: {
        jshint: {
          options: {eqnull: true, undef: true},
          globals: {stuff: true},
        },
      },
    };
    plugin = new Plugin(pluginCfg);
  });

  it('should be an object', () => expect(plugin).to.be.ok);

  it('should has #lint method', () => {
    expect(plugin.lint).to.be.an.instanceof(Function);
  });

  it('should lint correctly', done => {
    plugin.lint({data: correctData, path: 'app/file.js'}).then(() => done(), error => expect(error).to.not.be.ok);
  });

  it('should give correct errors', done => {
    plugin.lint(fileMock).then(null, error => {
      expect(error).to.contain('Unnecessary semicolon');
      done();
    });
  });

  it('should ignore errors in paths other than "^app/..." by default', done => {
    expect(plugin.config.plugins.jshint.pattern).to.not.exist;
    plugin.lint({data: 'var a = 228;;', path: 'vendor/file.js'}).then(() => done(), error => expect(error).to.not.be.ok);
  });


  it('should consider other paths when the config contains a respective pattern', done => {
    pluginCfg.plugins.jshint.pattern = /^(vendor|app)\/.*\.js$/;
    plugin = new Plugin(pluginCfg);

    var content = 'var a = 228;;';

    plugin.lint({data: content, path: 'vendor/file.js'}).then(null, error => {
      expect(error).to.exist;
      expect(error).to.contain('Unnecessary semicolon');
      done();
    });
  });

  it('should read configs global options list', done => {
    var mocked = Object.assign({}, fileMock, {data: 'function a() {return stuff == null;}'});

    plugin.lint(mocked).then(() => done(), error => expect(error).to.not.be.ok);
  });

  it('should not return errors if warn_only is enabled', done => {
    plugin.warnOnly = true;
    plugin.lint(fileMock).then(() => done(), warn => {
      expect(warn).to.match(/^warn/);
      expect(warn).to.be.ok;
      done();
    });
  });

  it('should read options and globals from .jshintrc', done => {
    // remove the preloaded jshint options
    delete plugin.config.plugins.jshint.options;
    delete plugin.config.plugins.jshint.globals;


    var jshintrc = {
      globals: {
        stuff: true,
      },
      undef: true,
    };

    const ffs = new FakeFS();
    ffs.file('.jshintrc', JSON.stringify(jshintrc));
    ffs.patch();

    plugin = new Plugin(plugin.config);
    expect(plugin.globals).to.eql(jshintrc.globals);
    delete jshintrc.globals;
    expect(plugin.options).to.eql(jshintrc);
    done();
  });
});
