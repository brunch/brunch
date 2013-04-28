file_list = require '../src/fs_utils/file_list'

describe 'file_list', ->
  describe '_startsWith()', ->
    it 'should work correctly', ->
      expect(file_list._startsWith 'abc', 'abc').to.equal yes
      expect(file_list._startsWith 'abc', 'a').to.equal yes
      expect(file_list._startsWith 'abc', 'c').to.equal no
      expect(file_list._startsWith 'cba', 'b').to.equal no
