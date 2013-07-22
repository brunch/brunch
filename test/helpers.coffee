helpers = require '../src/helpers'

describe 'helpers', ->
  describe 'replaceConfigSlashes()', ->
    it 'should replace slashes with backslashes in config', ->
      unix = require './fixtures/unix_config'
      win = require './fixtures/win_config'
      expect(helpers.replaceConfigSlashes unix.config).to.eql win.config
