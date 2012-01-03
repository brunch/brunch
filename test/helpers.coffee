expect = require 'expect.js'
helpers = require '../src/helpers'

describe 'helpers', ->
  describe '#capitalize()', ->
    it 'should capitalize strings', ->
      (expect helpers.capitalize 'test').to.equal 'Test'
      (expect helpers.capitalize 'тест').to.equal 'Тест'
      (expect helpers.capitalize '').to.equal ''

  describe '#formatClassName()', ->
    it 'should return name of class by its filename', ->
      (expect helpers.formatClassName 'twitter_users').to.equal 'TwitterUsers'
      (expect helpers.formatClassName 'a_b_c_de_f').to.equal 'ABCDeF'
          
  describe '#sort()', ->
    it 'should sort a list of files with valid config', ->
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
  