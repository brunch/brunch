helpers = require '../src/helpers'

describe 'helpers', ->
  describe '#replaceSlashes', ->
    it 'should replace slashes with backslashes in config', ->
      unix = require './fixtures/unix_config'
      win = require './fixtures/win_config'
      expect(helpers.replaceSlashes unix.config).to.eql win.config

  describe '#sortByConfig()', ->
    it 'should sort files by config correctly', ->
      files = [
        'a',
        'b',
        'c',
        'vendor/5',
        'vendor/4',
        'd',
        'vendor/1',
        'vendor/3',
        'vendor/6',
        'e',
        'vendor/2'
      ]
      
      config =
        before: ['vendor/1', 'vendor/2', 'vendor/3', 'vendor/4', 'vendor/5']
        after: ['b']
        vendorPaths: ['vendor']
 
      expect(helpers.sortByConfig files, config).to.eql [
        'vendor/1',
        'vendor/2',
        'vendor/3',
        'vendor/4',
        'vendor/5',
        'vendor/6',
        'a',
        'c',
        'd',
        'e',
        'b'
      ]

  describe '#startsWith()', ->
    it 'should work correctly', ->
      expect(helpers.startsWith 'abc', 'abc').to.equal yes
      expect(helpers.startsWith 'abc', 'a').to.equal yes
      expect(helpers.startsWith 'abc', 'c').to.equal no
      expect(helpers.startsWith 'cba', 'b').to.equal no
