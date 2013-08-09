rewire = require 'rewire'
helpers = rewire '../src/helpers'

describe 'helpers', ->
  describe 'replaceConfigSlashes()', ->
    it 'should replace slashes with backslashes in config', ->
      helpers.__set__ 'isWindows', true
      unix = require './fixtures/unix_config'
      win = require './fixtures/win_config'
      expect(helpers.replaceConfigSlashes unix.config).to.eql win.config
