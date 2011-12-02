fs = require 'fs'
path = require 'path'

helpers = require '../src/helpers'

describe 'create build directories', ->
  beforeEach -> helpers.createBuildDirectories 'output'
  afterEach -> removeDirectory 'output'

  it 'should create directory structure for build path', ->
    expect(path.existsSync 'output/scripts').toBeTruthy()
    expect(path.existsSync 'output/styles').toBeTruthy()
