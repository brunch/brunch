{StitchCompiler} = require '../src/compilers'


describe 'package initializing', ->
  it 'should create a valid stitch package', ->
    options =
      rootPath: 'test/fixtures/base'
      dependencies: [
        'console-helper.js',
        'jquery-1.7.js',
        'underscore-1.1.7.js',
        'backbone-0.5.3.js'
      ]

    compiler = new StitchCompiler options

    package = compiler.package()
    package.paths.should.eql ['test/fixtures/base/app']
    package.dependencies[0].should.eql(
      'test/fixtures/base/vendor/scripts/console-helper.js'
    )