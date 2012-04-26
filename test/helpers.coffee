helpers = require '../src/helpers'

describe 'helpers', ->
  describe '#replaceSlashes', ->
    it 'should replace slashes with backslashes in config', ->
      unix = require './fixtures/unix_config'
      win = require './fixtures/win_config'
      expect(helpers.replaceSlashes unix.config).to.eql win.config

  describe '#startsWith()', ->
    it 'should work correctly', ->
      expect(helpers.startsWith 'abc', 'abc').to.equal yes
      expect(helpers.startsWith 'abc', 'a').to.equal yes
      expect(helpers.startsWith 'abc', 'c').to.equal no
      expect(helpers.startsWith 'cba', 'b').to.equal no
