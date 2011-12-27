helpers = require '../src/helpers'

describe 'helpers', ->
  describe '#compareArrayItems()', ->
    describe 'should compare correctly items', ->
      it 'which are in array', ->
        (helpers.compareArrayItems [555, 666], 555, 666).should.equal 0
        (helpers.compareArrayItems [555, 666], 666, 555).should.equal 1
      it 'one of which is in array', ->
        (helpers.compareArrayItems [555, 666], 666, 3292).should.equal -1
        (helpers.compareArrayItems [555, 666], 3292, 666).should.equal 1
      it 'which are not in array', ->
        (helpers.compareArrayItems [555, 666], 6, 5).should.equal 0

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
        
      (helpers.sort files, config).should.eql [
        {path: 'vendor/styles/helpers.css'}
        {path: 'app/styles/main.css'}
        {path: 'app/styles/user.styl'}
        {path: 'app/styles/self.css'}
        {path: 'app/styles/sidebar.sass'}
      ]
  