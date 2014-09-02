rewire = require 'rewire'
helpers = rewire '../src/helpers'

describe 'helpers', ->
  describe 'replaceConfigSlashes()', ->
    it 'should replace slashes with backslashes in config', ->
      helpers.__set__ 'isWindows', true
      unix = require './fixtures/unix_config'
      win = require './fixtures/win_config'
      expect(helpers.replaceConfigSlashes unix.config).to.eql win.config

  describe 'applyOverrides()', ->
    applyOverrides = helpers.__get__ 'applyOverrides'

    it 'should resolve plugins.on|off merge', ->
      config =
        plugins:
          on: ['a']
          off: ['b']
        overrides:
          foo:
            plugins:
              on: ['b']
          bar:
            plugins:
              off: ['a']
          baz:
            plugins:
              on: ['c']

      applyOverrides config, env: ['foo', 'bar', 'baz']
      expect(config.plugins).to.eql {on: ['c', 'b'], off: ['a']}
