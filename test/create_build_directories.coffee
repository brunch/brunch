fs = require 'fs'
path = require 'path'

brunch = require '../src/brunch'


describe 'create build directories', ->
  beforeEach -> brunch.createBuildDirectories 'output'
  afterEach -> removeDirectory 'output'

  it 'should create directory structure for build path', ->
    js = fs.statSync 'output/web/js', 'utf8'
    css = fs.statSync 'output/web/js', 'utf8'
    expect(path.existsSync 'output/web/js').toBeTruthy()
    expect(path.existsSync 'output/web/css').toBeTruthy()
