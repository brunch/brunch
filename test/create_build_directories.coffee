fs = require 'fs'
path = require 'path'

helpers = require '../src/helpers'
specHelpers = require './spec_helpers'

describe 'create build directories', ->
  beforeEach ->
    helpers.createBuildDirectories 'output'

  afterEach (done) ->
    specHelpers.removeDirectory 'output', done

  it 'should create directory structure for build path', ->
    (path.existsSync 'output/scripts').should.be.ok
    (path.existsSync 'output/styles').should.be.ok
