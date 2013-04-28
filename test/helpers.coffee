helpers = require '../src/helpers'

describe 'helpers', ->
  describe 'replaceSlashes()', ->
    it 'should replace slashes with backslashes in config', ->
      unix = require './fixtures/unix_config'
      win = require './fixtures/win_config'
      expect(helpers.replaceSlashes unix.config).to.eql win.config
