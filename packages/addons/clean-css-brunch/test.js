/* eslint no-undef: 0 */
'use strict';

const expect = require('chai').expect;
const Plugin = require('./');

describe('Plugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new Plugin({});
  });

  it('should be an object', () => expect(plugin).to.be.ok);

  it('should has #optimize method', () => {
    expect(plugin.optimize).to.be.an.instanceof(Function);
  });

  it('should compile and produce valid result', done => {
    const content = '#first { font-size: 14px; color: #b0b; }';
    const expected = '#first{font-size:14px;color:#b0b}';

    plugin.optimize({data: content, path: ''})
      .then(data => {
        expect(data).to.equal(expected);
        done();
      })
      .catch(error => expect(error).not.to.be.ok);
  });

  it('should compile and produce a result clean-css options are reflected in', done => {
    plugin.options = {level: 2, specialComments: false};

    const eol = require('os').EOL;

    const content = '#first { color: red; }\r\n#second { color: blue; }';
    const expected = `#first{color:red}#second{color:#00f}`;

    plugin.optimize({data: content, path: ''})
      .then(data => {
        expect(data).to.equal(expected);
        done();
      })
      .catch(error => {
        console.log(error);
        expect(error).not.to.be.ok
      });
  });

  it('should return a non minified css if path is in "ignore" list', done => {
    plugin.options = {
      ignored: /ignore-me\.css/,
    };

    const content = '#first { font-size: 14px; color: #b0b; }';
    const expected = content;

    plugin.optimize({data: content, path: 'dist/ignore-me.css'})
      .then(data => {
        expect(data).to.equal(expected);
        done();
      })
      .catch(error => expect(error).not.to.be.ok);
  });
});
