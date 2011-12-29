expect = require 'expect.js'
helpers = require '../src/helpers'

describe 'helpers', ->
  describe '#compareArrayItems()', ->
    describe 'should compare correctly items', ->
      it 'which are in array', ->
        expect(helpers.compareArrayItems [555, 666], 555, 666).to.equal 0
        expect(helpers.compareArrayItems [555, 666], 666, 555).to.equal 1
      it 'one of which is in array', ->
        expect(helpers.compareArrayItems [555, 666], 666, 3292).to.equal -1
        expect(helpers.compareArrayItems [555, 666], 3292, 666).to.equal 1
      it 'which are not in array', ->
        expect(helpers.compareArrayItems [555, 666], 6, 5).to.equal 0

  describe '#sort()', ->
    it 'should sort files by config', ->
      files = [
        {path: 'app/styles/sidebar.sass'}
        {path: 'app/styles/self.css'}
        {path: 'app/styles/user.styl'}
        {path: 'vendor/styles/helpers.css'}
        {path: 'app/styles/main.css'}
      ]

      config =
        before: [
          'app/styles/main.css', 'app/styles/user.styl',
          'app/styles/self.css'
        ]
        after: ['vendor/styles/helpers.css']

      expect(helpers.sort files, config).to.eql [
        {path: 'vendor/styles/helpers.css'}
        {path: 'app/styles/main.css'}
        {path: 'app/styles/user.styl'}
        {path: 'app/styles/self.css'}
        {path: 'app/styles/sidebar.sass'}
      ]
  