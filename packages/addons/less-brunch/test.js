/* eslint-env mocha */
/* eslint no-unused-expressions: off */

'use strict';

const fs = require('fs');
const join = require('path').join;
const expect = require('chai').expect;
const LESSCompiler = require('./');

describe('less-brunch', () => {
  let plugin;

  beforeEach(() => {
    plugin = new LESSCompiler({
      paths: {root: '.'},
      plugins: {},
    });
  });

  it('should be an object', () => {
    expect(plugin).to.be.an.instanceof(LESSCompiler);
  });

  it('should have #compile method', () => {
    expect(plugin).to.respondTo('compile');
  });

  it('should have #getDependencies method', () => {
    expect(plugin).to.respondTo('getDependencies');
  });

  it('should compile and produce valid result', () => {
    const data = '@color: #4D926F; #header {color: @color;}';
    const expected = '#header {\n  color: #4D926F;\n}\n';

    return plugin.compile({data, path: 'style.less'}).then(result => {
      expect(result.data).to.equal(expected);
    });
  });

  it('should handle invalid less gracefully', () => {
    const data = '#header {color: @color;}';
    const expected = 'L1:16 NameError: variable @color is undefined';

    return plugin.compile({data, path: 'style.less'}).catch(error => {
      expect(error.toString()).to.equal(expected);
    });
  });

  it('should correctly identify stylesheet and data-uri dependencies', () => {
    const path = 'test-files/test-dependency-resolution.less';
    const data = fs.readFileSync(path, 'utf-8');

    return plugin.getDependencies({data, path}).then(deps => {
      expect(deps).to.deep.equal([
        join('test-files', 'test-include.less'),
        join('test-files', 'img', 'foo.jpg'),
      ]);
    });
  });
});
