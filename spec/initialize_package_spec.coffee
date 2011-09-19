require.paths.unshift __dirname + "/../src"

{StitchCompiler} = require(__dirname + "/../src/compilers")


describe "package initializing", ->
  it "should create a valid stitch package", ->
    options =
      brunchPath: "spec/fixtures/base"
      dependencies: [
        "ConsoleDummy.js",
        "jquery-1.6.2.js",
        "underscore-1.1.7.js",
        "backbone-0.5.3.js"
      ]

    compiler = new StitchCompiler options

    package = compiler.package()
    expect(package.paths).toEqual ["spec/fixtures/base/src/app/"]
    expect(package.dependencies[0]).toEqual(
      "spec/fixtures/base/src/vendor/ConsoleDummy.js"
    )