require.paths.unshift __dirname + "/../src"

path = require "path"

{StitchCompiler} = require "#{__dirname}/../src/compilers"

describe "package initializing", ->
  it "should create a valid stitch package", ->
    options =
      filePattern: [/\.coffee$/, /src\/.*\.js$/, /\.eco$/]
      dependencies: [
        "ConsoleDummy.js"
        "jquery-1.6.2.js"
        "underscore-1.1.7.js"
        "backbone-0.5.3.js"
      ]
      minify: false

    compiler = new StitchCompiler "spec/fixtures/base", options

    package = compiler.package()
    expect(package.paths).toEqual [
      path.join(__dirname, "fixtures/base/src/app")
    ]
    expect(package.dependencies[0]).toEqual(
      path.join(__dirname, "fixtures/base/src/vendor/ConsoleDummy.js")
    )