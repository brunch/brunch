package = require '../src/package'


describe 'brunch', ->
  it 'version number should be a string', ->
    (typeof package.version).should.eql 'string'
