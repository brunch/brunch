fs = require 'fs'
fs_utils = require '../src/fs_utils'
sysPath = require 'path'

describe 'fs_utils', ->
  describe '#spectate', ->
    it 'should watch files', (done) ->
      added = no
      removed = no
      path = sysPath.join 'fixtures', 'meh'
      watcher = fs_utils
        .spectate('fixtures', persistent: yes)
        .on('add', -> added = yes)
        .on('unlink', -> removed = yes)
      expect(added).not.to.be.ok()
      expect(removed).not.no.be.ok()
      fs.writeFile path, '', (error) ->
        expect(added).to.be.ok()
        expect(removed).to.be.ok()
        fs.unlink path, (error) ->
          expect(removed).to.be.ok()
          done()

    it 'should ignore files with option', (done) ->
      
