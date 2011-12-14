{StitchCompiler} = require '../src/compilers'


describe 'brunch dependencies', ->
  it 'should be collected', ->
    options =
      dependencies: [
        'ConsoleDummy.js'
        'jquery-1.7.js'
        'underscore-1.1.7.js'
        'backbone-0.5.3.js'
      ]
      appPath: 'test/fixtures/base'
    compiler = new StitchCompiler options
    dependencyPaths = compiler.collect 'vendor'
    dependencyPaths.should.eql [
      'test/fixtures/base/src/vendor/ConsoleDummy.js',
      'test/fixtures/base/src/vendor/jquery-1.7.js',
      'test/fixtures/base/src/vendor/underscore-1.1.7.js',
      'test/fixtures/base/src/vendor/backbone-0.5.3.js'
    ]

  it 'should include backbone-localstorage and ignore dotfiles / dirs', ->
    options =
      dependencies: [
        'ConsoleDummy.js'
        'jquery-1.7.js'
        'underscore-1.1.7.js'
        'backbone-0.5.3.js'
        'backbone-localstorage.js'
      ]
      appPath: 'test/fixtures/alternate_base'
    compiler = new StitchCompiler options
    dependencyPaths = compiler.collect 'vendor'
    dependencyPaths.should.eql [
      'test/fixtures/alternate_base/src/vendor/ConsoleDummy.js'
      'test/fixtures/alternate_base/src/vendor/jquery-1.7.js'
      'test/fixtures/alternate_base/src/vendor/underscore-1.1.7.js'
      'test/fixtures/alternate_base/src/vendor/backbone-0.5.3.js'
      'test/fixtures/alternate_base/src/vendor/backbone-localstorage.js'
    ]
