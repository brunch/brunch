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
      rootPath: 'test/fixtures/base'
    compiler = new StitchCompiler options
    dependencyPaths = compiler.collect 'vendor'
    expect(dependencyPaths).toEqual [
      'test/fixtures/base/vendor/ConsoleDummy.js',
      'test/fixtures/base/vendor/jquery-1.7.js',
      'test/fixtures/base/vendor/underscore-1.1.7.js',
      'test/fixtures/base/vendor/backbone-0.5.3.js'
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
      rootPath: 'test/fixtures/alternate_base'
    compiler = new StitchCompiler options
    dependencyPaths = compiler.collect 'vendor'
    expect(dependencyPaths).toEqual [
      'test/fixtures/alternate_base/vendor/ConsoleDummy.js'
      'test/fixtures/alternate_base/vendor/jquery-1.7.js'
      'test/fixtures/alternate_base/vendor/underscore-1.1.7.js'
      'test/fixtures/alternate_base/vendor/backbone-0.5.3.js'
      'test/fixtures/alternate_base/vendor/backbone-localstorage.js'
    ]
