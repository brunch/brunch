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

  describe '#groupCompilerFiles()', ->
    it 'should group', ->
      files = [
        {destination: 'a', data: 1, str: 'f1'}
        {destination: 'a', data: 2, str: 'f2'}
        {destination: 'b', data: 3, str: 'f3'}
      ]
      helpers.groupCompilerFiles(files).should.eql [
        {destination: 'a', files: [{data: 1, str: 'f1'}, {data: 2, str: 'f2'}]},
        {destination: 'b', files: [{data: 3, str: 'f3'}]}
      ]

  describe '#sortCompilerFiles()', ->
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

      helpers.sortCompilerFiles(files, config).should.eql [
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

  describe 'grouping and sorting', ->
    it 'should group and sort files with configs', ->
      [
        {destinationPath: 'styles/app.css', sourcePath: 'app/styles/self.css', sourceData: '.user-self {float: none;}', callback: 'fn3'}
        {destinationPath: 'styles/app.css', sourcePath: 'app/styles/user.styl', sourceData: '.user {float: right;}', callback: 'fn2'}
        {destinationPath: 'styles/app.css', sourcePath: 'app/styles/sidebar.sass', sourceData: '#sidebar {color: red;}', callback: 'fn4'}
        {destinationPath: 'scripts/app.js', sourcePath: 'app/item.coffee', sourceData: 'data = 1', callback: 'zn1'}
        {destinationPath: 'styles/app.css', sourcePath: 'vendor/styles/helpers.css', sourceData: '.container {float: none;}', callback: 'fn5'}
        {destinationPath: 'styles/app.css', sourcePath: 'app/styles/main.css', sourceData: 'body {font-size: 15px;}', callback: 'fn1'}
      ]

      config =
        order:
          'scripts/app.js':
            before: ['app/backbone.js']
          'styles/app.css':
            before: ['app/styles/main.css', 'app/styles/user.styl', 'app/styles/self.css']
            after: ['vendor/styles/helpers.css']
      a
      [
        {
          path: 'scripts/app.js'
          source: [
            {path: 'app/item.coffee', data: 'data = 1', callback: 'zn1'}
          ]
        },
        {
          path: 'styles/app.css',
          source: [
            {path: 'app/styles/main.css', data: 'body {font-size: 15px;}', callback: 'fn1'}
            {path: 'app/styles/user.styl', data: '.user {float: right;}', callback: 'fn2'}
            {path: 'app/styles/self.css', data: '.user-self {float: none;}', callback: 'fn3'}
            {path: 'app/styles/sidebar.sass', data: '#sidebar {color: red;}', callback: 'fn4'}
            {path: 'vendor/styles/helpers.css', data: '.container {float: none;}', callback: 'fn5'}    
          ]
        }
      ]
      
      zzzz.should.equal '''body {font-size: 15px;}
.user {float: right;}
.user-self {float: none;}
#sidebar {color: red;}
.container {float: none;}'''
