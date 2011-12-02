{StitchCompiler} = require '../src/compilers'


describe 'package initializing', ->
  it 'should create a valid stitch package', ->
    options =
      appPath: 'test/fixtures/base'
      dependencies: [
        'ConsoleDummy.js',
        'jquery-1.7.js',
        'underscore-1.1.7.js',
        'backbone-0.5.3.js'
      ]

    compiler = new StitchCompiler options

    package = compiler.package()
    package.paths.should.eql ['test/fixtures/base/src/app/']
    package.dependencies[0].should.eql(
      'test/fixtures/base/src/vendor/ConsoleDummy.js'
    )