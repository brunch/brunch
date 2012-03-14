expect = require 'expect.js'
helpers = require '../src/helpers'

describe 'helpers', ->
  describe '#startsWith()', ->
    it 'should work correctly', ->
      expect(helpers.startsWith 'abc', 'abc').to.equal yes
      expect(helpers.startsWith 'abc', 'a').to.equal yes
      expect(helpers.startsWith 'abc', 'c').to.equal no
      expect(helpers.startsWith 'cba', 'b').to.equal no
