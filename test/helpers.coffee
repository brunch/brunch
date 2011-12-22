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
