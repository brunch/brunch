'use strict';

const expect = require('chai').expect;
const CoffeeCompiler = require('./');

describe('coffee-script-brunch', () => {
  const path = 'file.coffee';
  let plugin;

  beforeEach(() => {
    plugin = new CoffeeCompiler({
      conventions: {},
      plugins: {},
    });
  });

  it('should be an object', () => {
    expect(plugin).to.be.an.instanceof(CoffeeCompiler);
  });

  it('should have #compile method', () => {
    expect(plugin).to.respondTo('compile');
  });

  it('should compile and produce valid result', () => {
    const data = 'a = 1';
    const expected = 'var a;\n\na = 1;\n';

    return plugin.compile({data, path}).then(file => {
      expect(file.data).to.equal(expected);
    });
  });

  it('should compile literal source and produce valid result', () => {
    const data = 'I am a literal string\n\n    a = 1';
    const path = 'file.litcoffee';
    const expected = '// I am a literal string\nvar a;\n\na = 1;\n';

    return plugin.compile({data, path}).then(file => {
      expect(file.data).to.equal(expected);
    });
  });

  it('should produce source maps', () => {
    plugin = new CoffeeCompiler({
      conventions: {},
      plugins: {},
      sourceMaps: true,
    });

    const data = 'a = 1';
    const expected = 'var a;\n\na = 1;\n';

    return plugin.compile({data, path}).then(file => {
      expect(file.data).to.equal(expected);
      expect(file.map).to.be.a('string');
    });
  });

  it('should produce inline source maps', () => {
    plugin = new CoffeeCompiler({
      conventions: {},
      plugins: {},
      sourceMaps: 'inline',
    });

    const data = 'a = 1';

    return plugin.compile({data, path}).then(file => {
      expect(file.data).to
        .include(data)
        .include('//# sourceMappingURL=data:application/json;base64,')
        .include(`//# sourceURL=${path}`);
    });
  });

  it('should support explicit bare setting', () => {
    plugin = new CoffeeCompiler({
      conventions: {},
      plugins: {coffeescript: {bare: false}},
    });

    let data = 'a = 1';
    let expected = '(function() {\n  var a;\n\n  a = 1;\n\n}).call(this);\n';

    return plugin.compile({data, path}).then(file => {
      expect(file.data).to.equal(expected);

      plugin = new CoffeeCompiler({
        conventions: {},
        plugins: {coffeescript: {bare: true}},
      });

      data = 'a = 1';
      expected = 'var a;\n\na = 1;\n';

      return plugin.compile({data, path}).then(file => {
        expect(file.data).to.equal(expected);
      });
    });
  });

  it('should support transpile settings', () => {
    plugin = new CoffeeCompiler({
      conventions: {},
      plugins: {coffeescript: {transpile: false}},
    });

    const data = 'a = () => {};';
    let expected = 'var a;\n\na = () => {\n  return {};\n};\n';

    return plugin.compile({data, path}).then(file => {
      expect(file.data).to.equal(expected);

      plugin = new CoffeeCompiler({
        conventions: {},
        plugins: {coffeescript: {transpile: {plugins: ['@babel/plugin-transform-arrow-functions']}}},
      });

      expected = 'var a;\n\na = function () {\n  return {};\n};';

      return plugin.compile({data, path}).then(file => {
        expect(file.data).to.equal(expected);
      });
    });
  });
});
