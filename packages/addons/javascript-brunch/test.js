'use strict';

const expect = require('chai').expect;
const Plugin = require('./');

describe(Plugin.name, () => {
  let plugin;

  beforeEach(() => {
    plugin = new Plugin({plugins: {}});
  });

  it('should be an object', () => {
    expect(plugin).to.be.an('object');
  });

  it('should have #compile method', () => {
    expect(plugin).to.respondTo('compile');
  });

  it('should compile and produce valid result', () => {
    const data = 'var a = 6;';

    return plugin.compile({data}).then(result => {
      expect(result.data).to.equal(data);
    });
  });

  it('should validate JS syntax', () => {
    return plugin.compile({data: 'var a =;'}).catch(error => {
      expect(error).to.be.an.instanceof(Error);
    });
  });

  it('should not validate JS syntax with an option', () => {
    plugin = new Plugin({plugins: {javascript: {validate: false}}});
    return plugin.compile({data: 'var a =;'});
  });

  it('should not validate syntax of transpiled files', () => {
    const file = {data: 'var a =;', map: {}};
    return plugin.compile(file).then(result => {
      expect(result).to.equal(file);
    });
  });
});
