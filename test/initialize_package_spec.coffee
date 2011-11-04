{StitchCompiler} = require __dirname + "/../src/compilers"


describe "package initializing", ->
  it "should create a valid stitch package", ->
    options =
      appPath: "test/fixtures/base"
      dependencies: [
        "ConsoleDummy.js",
        "jquery-1.7.js",
        "underscore-1.1.7.js",
        "backbone-0.5.3.js"
      ]

    compiler = new StitchCompiler options

    package = compiler.package()
    expect(package.paths).toEqual ["test/fixtures/base/src/app/"]
    expect(package.dependencies[0]).toEqual(
      "test/fixtures/base/src/vendor/ConsoleDummy.js"
    )