common = require '../src/fs_utils/common'

describe 'common', ->
  describe 'ignored()', ->
    it 'should ignore invalid files', ->
      files = [
        'app/assets/index.html'
        'app/assets/favicon.ico'
        'app/assets/.htaccess'
        'app/assets/.rewrite'
        'app/assets/#index.html#'
        'app/assets/.index.html.swp'
      ]
      expectedIgnoredFiles = [
        'app/assets/#index.html#'
        'app/assets/.index.html.swp'
      ]
      expect(files.filter common.ignored).to.eql expectedIgnoredFiles

