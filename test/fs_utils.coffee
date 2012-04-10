fs = require 'fs'
fs_utils = require '../src/fs_utils'
sysPath = require 'path'

describe 'fs_utils', ->
  it 'should ignore files with option', (done) ->
      
