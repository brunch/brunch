{StitchCompiler} = require __dirname + "/../src/compilers"


describe "brunch dependencies", ->
  it "should be collected", ->
    options =
      dependencies: [
        "ConsoleDummy.js"
        "jquery-1.6.2.js"
        "underscore-1.1.7.js"
        "backbone-0.5.3.js"
      ]
      appPath: "test/fixtures/base"
    compiler = new StitchCompiler options
    dependencyPaths = compiler.collectDependencies()
    expect(dependencyPaths).toEqual [
      "test/fixtures/base/src/vendor/ConsoleDummy.js",
      "test/fixtures/base/src/vendor/jquery-1.6.2.js",
      "test/fixtures/base/src/vendor/underscore-1.1.7.js",
      "test/fixtures/base/src/vendor/backbone-0.5.3.js"
    ]

  it "should include backbone-localstorage and ignore dotfiles / dirs", ->
    options =
      dependencies: [
        "ConsoleDummy.js"
        "jquery-1.6.2.js"
        "underscore-1.1.7.js"
        "backbone-0.5.3.js"
        "backbone-localstorage.js"
      ]
    compiler = new StitchCompiler options
    compiler.vendorPath = "test/fixtures/alternate_vendor"
    dependencyPaths = compiler.collectDependencies()
    expect(dependencyPaths).toEqual [
      "test/fixtures/alternate_vendor/ConsoleDummy.js"
      "test/fixtures/alternate_vendor/jquery-1.6.2.js"
      "test/fixtures/alternate_vendor/underscore-1.1.7.js"
      "test/fixtures/alternate_vendor/backbone-0.5.3.js"
      "test/fixtures/alternate_vendor/backbone-localstorage.js"
    ]
