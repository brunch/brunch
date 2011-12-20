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
    it 'should sort', ->
      arrays = [
        ['1', '2', '3']
        ['2', '3', '1']
        ['3', '2', '1']
        ['1', '3', '2']
        ['2', '1', '3']
        ['3', '1', '2']
      ]
      config =
        before: ['1']
        after: ['3']
      expected = ['1', '2', '3']
      for arr in arrays
        helpers.sortByConfig(arr, config).should.eql expected

  describe '#groupLanguageFiles()', ->
    it 'should group', ->
      files = [
        {destinationPath: 'a', data: 1, str: 'f1'}
        {destinationPath: 'a', data: 2, str: 'f2'}
        {destinationPath: 'b', data: 3, str: 'f3'}
      ]
      helpers.groupLanguageFiles(files).should.eql [
        {path: 'a', sourceFiles: [{data: 1, str: 'f1'}, {data: 2, str: 'f2'}]},
        {path: 'b', sourceFiles: [{data: 3, str: 'f3'}]}
      ]

  describe '#sortLanguageFiles()', ->
    it 'should sort files by config', ->
      files = [
        {
          path: 'scripts/app.js'
          sourceFiles: [
            {path: 'app/item.coffee'}
          ]
        },
        {
          path: 'styles/app.css',
          sourceFiles: [
            {path: 'app/styles/sidebar.sass'}
            {path: 'app/styles/self.css'}
            {path: 'app/styles/user.styl'}
            {path: 'vendor/styles/helpers.css'}
            {path: 'app/styles/main.css'}
          ]
        }
      ]

      config =
        order:
          'scripts/app.js':
            before: ['app/backbone.js']
          'styles/app.css':
            before: [
              'app/styles/main.css', 'app/styles/user.styl',
              'app/styles/self.css'
            ]
            after: ['vendor/styles/helpers.css']

      sorted = (helpers.sortLanguageFiles files, config)
      expected = [
        {
          path: 'scripts/app.js'
          sourceFiles: [
            {path: 'app/item.coffee'}
          ]
        },
        {
          path: 'styles/app.css',
          sourceFiles: [
            {path: 'app/styles/main.css'}
            {path: 'app/styles/user.styl'}
            {path: 'app/styles/self.css'}
            {path: 'app/styles/sidebar.sass'}
            {path: 'vendor/styles/helpers.css'} 
          ]
        }
      ]
      sorted.should.eql expected

    it 'should work correctly with #groupLanguageFiles()', ->
      files = [
        {
          destinationPath: 'scripts/app.js'
          path: 'app/item.coffee'
          data: 'data = 1'
          callback: 'zn1'
        }
        {
          destinationPath: 'styles/app.css'
          path: 'app/styles/self.css'
          data: '.user-self {float: none;}'
          callback: 'fn3'
        }
        {
          destinationPath: 'styles/app.css'
          path: 'app/styles/user.styl'
          data: '.user {float: right;}'
          callback: 'fn2'
        }
        {
          destinationPath: 'styles/app.css'
          path: 'app/styles/sidebar.sass'
          data: '#sidebar {color: red;}'
          callback: 'fn4'
        }
        {
          destinationPath: 'styles/app.css'
          path: 'vendor/styles/helpers.css'
          data: '.container {float: none;}'
          callback: 'fn5'
        }
        {
          destinationPath: 'styles/app.css'
          path: 'app/styles/main.css'
          data: 'body {font-size: 15px;}'
          callback: 'fn1'
        }
      ]

      config =
        order:
          'scripts/app.js':
            before: ['app/backbone.js']
          'styles/app.css':
            before: ['app/styles/main.css', 'app/styles/user.styl', 'app/styles/self.css']
            after: ['vendor/styles/helpers.css']

      grouped = (helpers.groupLanguageFiles files)
      result = helpers.sortLanguageFiles grouped, config
      expected = [
        {
          path: 'scripts/app.js'
          sourceFiles: [
            {path: 'app/item.coffee', data: 'data = 1', callback: 'zn1'}
          ]
        }
        {
          path: 'styles/app.css'
          sourceFiles: [
            {
              path: 'app/styles/main.css'
              data: 'body {font-size: 15px;}'
              callback: 'fn1'
            }
            {
              path: 'app/styles/user.styl'
              data: '.user {float: right;}'
              callback: 'fn2'
            }
            {
              path: 'app/styles/self.css'
              data: '.user-self {float: none;}'
              callback: 'fn3'
            }
            {
              path: 'app/styles/sidebar.sass'
              data: '#sidebar {color: red;}'
              callback: 'fn4'
            }
            {
              path: 'vendor/styles/helpers.css'
              data: '.container {float: none;}'
              callback: 'fn5'
            }
          ]
        }
      ]
      result.should.eql expected
