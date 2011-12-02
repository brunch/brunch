fs = require 'fs'
path = require 'path'

helpers = require '../src/helpers'
specHelpers = require './spec_helpers'

describe 'create build directories', ->
  beforeEach -> helpers.createBuildDirectories 'output'
  afterEach (done) -> specHelpers.removeDirectory 'output', done

  it 'should create directory structure for build path', ->
    (path.existsSync 'output/web/js').should.be.ok
    (path.existsSync 'output/web/css').should.be.ok
