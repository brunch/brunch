expect = require 'expect.js'
helpers = require '../src/helpers'

describe 'helpers', ->
  describe '#sort()', ->
    it 'should work', ->
      files = [
        '9'
        '10'
        '8'
        'vendor/5'
        'vendor/4'
        '11'
        'vendor/1'
        'vendor/3'
        'vendor/6'
        '7'
        'vendor/2'
      ]
      
      config =
        before: ['vendor/1', 'vendor/2', 'vendor/3', 'vendor/4', 'vendor/5']
        after: ['8', '9', '10', '11']

      expect(helpers.sort files, config).to.eql [
        'vendor/1'
        'vendor/2'
        'vendor/3'
        'vendor/4'
        'vendor/5'
        'vendor/6'
        '7'
        '8'
        '9'
        '10'
        '11'
      ]
  