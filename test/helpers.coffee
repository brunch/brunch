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
  describe '#group()', ->
    it 'should group', ->
      helpers.group([
        {destination: 'a', data: 1, callback: 'f1'},
        {destination: 'a', data: 2, callback: 'f2'},
        {destination: 'b', data: 3, callback: 'f3'}
      ], 'destination').should.eql [
        {destination: 'a', data: [1, 2], callback: ['f1', 'f2']},
        {destination: 'b', data: [3], callback: ['f3']}
      ]
