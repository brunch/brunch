require.paths.unshift __dirname + "/../src"

path = require "path"

{StitchCompiler} = require "#{__dirname}/../src/compilers"

describe "brunch dependencies", ->
  it "should be collected", ->
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
    dependencyPaths = compiler.collectDependencies()
    expect(dependencyPaths).toEqual [
      path.join(__dirname, "fixtures/base/src/vendor/ConsoleDummy.js")
      path.join(__dirname, "fixtures/base/src/vendor/jquery-1.6.2.js")
      path.join(__dirname, "fixtures/base/src/vendor/underscore-1.1.7.js")
      path.join(__dirname, "fixtures/base/src/vendor/backbone-0.5.3.js")
    ]

  it "should include backbone-localstorage and ignore dotfiles / dirs", ->
    options =
      filePattern: [/\.coffee$/, /src\/.*\.js$/, /\.eco$/]
      dependencies: [
        "ConsoleDummy.js"
        "jquery-1.6.2.js"
        "underscore-1.1.7.js"
        "backbone-0.5.3.js"
        "backbone-localstorage.js"
      ]
      minify: false

    compiler = new StitchCompiler "spec/fixtures/", options
    compiler.vendorPath = "alternate_vendor"
    dependencyPaths = compiler.collectDependencies()
    expect(dependencyPaths).toEqual [
      path.join(__dirname, "fixtures/alternate_vendor/ConsoleDummy.js")
      path.join(__dirname, "fixtures/alternate_vendor/jquery-1.6.2.js")
      path.join(__dirname, "fixtures/alternate_vendor/underscore-1.1.7.js")
      path.join(__dirname, "fixtures/alternate_vendor/backbone-0.5.3.js")
      path.join(__dirname, "fixtures/alternate_vendor/backbone-localstorage.js")
    ]
