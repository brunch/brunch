fs = require 'fs'
path = require 'path'

helpers = require '../src/helpers'

describe 'create build directories', ->
  beforeEach -> helpers.createBuildDirectories 'output'
  afterEach -> removeDirectory 'output'

  it 'should create directory structure for build path', ->
    expect(path.existsSync 'output/web/js').toBeTruthy()
    expect(path.existsSync 'output/web/css').toBeTruthy()
