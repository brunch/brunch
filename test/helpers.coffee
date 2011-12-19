helpers  = require '../src/helpers'


describe 'helpers', ->
  describe '#filterFiles()', ->
    it 'should filter file list for dotfiles and directories', ->
      dependencyPaths = helpers.filterFiles [
        'console-helper.js'
        '.to_be_ignored'
        'should_be_ignored'
        '#to_be_ignored#'
      ], 'test/fixtures/alternate_base/vendor/scripts'
      dependencyPaths.should.eql ['console-helper.js']

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

  describe '#sortByConfig()', ->
    data = ['d', 'b', 'c', 'a', 'e']
    config =
      before: ['a', 'c']
      after: ['b', 'd']
    (helpers.sortByConfig data, config).should.eql [
      'a', 'c', 'e', 'b', 'd'
    ]
    

  describe '#groupLanguageFiles()', ->
    it 'should group', ->
      files = [
        {destination: 'a', data: 1, str: 'f1'}
        {destination: 'a', data: 2, str: 'f2'}
        {destination: 'b', data: 3, str: 'f3'}
      ]
      helpers.groupLanguageFiles(files).should.eql [
        {destination: 'a', files: [{data: 1, str: 'f1'}, {data: 2, str: 'f2'}]},
        {destination: 'b', files: [{data: 3, str: 'f3'}]}
      ]

  describe '#sortLanguageFiles()', ->


    it 'should sort files by config', ->
      files = [
        {
          destination: 'scripts/app.js'
          files: [
            {source: 'app/item.coffee'}
          ]
        },
        {
          destination: 'styles/app.css',
          files: [
            {source: 'app/styles/self.css'}
            {source: 'app/styles/user.styl'}
            {source: 'vendor/styles/helpers.css'}
            {source: 'app/styles/sidebar.sass'}
            {source: 'app/styles/main.css'}  
          ]
        }
      ]

      config =
        order:
          'scripts/app.js':
            before: ['app/backbone.js']
          'styles/app.css':
            before: ['app/styles/main.css', 'app/styles/user.styl', 'app/styles/self.css']
            after: ['vendor/styles/helpers.css']

      (helpers.sortLanguageFiles files, config).should.eql [
        {
          destination: 'scripts/app.js'
          files: [
            {source: 'app/item.coffee'}
          ]
        },
        {
          destination: 'styles/app.css',
          files: [
            {source: 'app/styles/main.css'}
            {source: 'app/styles/user.styl'}
            {source: 'app/styles/self.css'}
            {source: 'app/styles/sidebar.sass'}
            {source: 'vendor/styles/helpers.css'} 
          ]
        }
      ]
