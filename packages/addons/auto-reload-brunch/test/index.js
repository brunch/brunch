'use strict';

const expect = require('chai').expect;
const extend = require('util')._extend;
const path = require('path');

const Plugin = require('../index');

describe('Plugin', () => {

  let subject = null;

  beforeEach(() => {
    subject = config => new Plugin({
      persistent: true,
      hot: config && config.hot,
      plugins: {autoReload: config || {}},
    });
  });

  it('should has #onCompile method', () => {
    expect(subject()).to.respondTo('onCompile');
  });

  describe('SSL support', () => {
    it('should not start an HTTPS server', () => {
      const plugin = subject();
      expect(plugin.ssl).to.not.be.ok;
      expect(plugin.httpsServer).to.be.undefined;
    });

    context('keyPath and certPath present', () => {
      const sslOptions = {
        enabled: true,
        keyPath: path.join(__dirname, './lvh.me.key'),
        certPath: path.join(__dirname, './lvh.me.cert'),
      };

      it('should start an HTTPS server', () => {
        const plugin = subject(sslOptions);
        expect(plugin).to.be.ok;
        expect(plugin.ssl).to.be.true;
        expect(plugin.httpsServer).to.be.ok;
      });

      context('plugin disabled', () => {
        it('should not start an HTTPS server', () => {
          const plugin = subject(extend(sslOptions, {enabled: false}));
          expect(plugin.ssl).to.be.true;
          expect(plugin.httpsServer).to.be.undefined;
        });
      });
    });
  });

  describe('with match option', () => {
    it('matches "stylesheet" by default', () => {
      const messages = [];
      const plugin = subject();
      plugin.connections = [mockConnection(msg => messages.push(msg))];
      plugin.onCompile([{
        path: 'public/abc.css',
      }]);
      expect(messages).to.eql(['stylesheet']);
    });

    it('matches "javascript" by default', () => {
      const messages = [];
      const plugin = subject({hot: true});
      plugin.connections = [mockConnection(msg => messages.push(msg))];
      plugin.onCompile([{
        path: 'public/abc.js',
      }]);
      expect(messages).to.eql(['javascript', 'stylesheet']);
    });

    it('matches "page" for unknowns', () => {
      const messages = [];
      const plugin = subject();
      plugin.connections = [mockConnection(msg => messages.push(msg))];
      plugin.onCompile([{
        path: 'public/abc.xyz',
      }]);
      expect(messages).to.eql(['page']);
    });

    it('honors match.stylesheets', () => {
      const messages = [];
      const plugin = subject({
        match: {stylesheets: /.scss$/},
      });
      plugin.connections = [mockConnection(msg => messages.push(msg))];
      plugin.onCompile([{
        path: 'public/abc.scss',
      }]);
      expect(messages).to.eql(['stylesheet']);
    });

    it('honors match.javascripts', () => {
      const messages = [];
      const plugin = subject({
        match: {javascripts: /.jsx$/},
        hot: true,
      });
      plugin.connections = [mockConnection(msg => messages.push(msg))];
      plugin.onCompile([{
        path: 'public/abc.jsx',
      }]);
      expect(messages).to.eql(['javascript', 'stylesheet']);
    });

    const mockConnection = fn => ({
      readyState: 1,
      send: fn,
    });
  });
});
