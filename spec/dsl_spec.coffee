require.paths.unshift __dirname + "/../src"

fs = require "fs"

dsl = require "dsl"

describe "dsl", ->
  it "should parse given string", ->
    options = "files([/\\.styl$/]).use('stylus').output('web/css/main.css')"

    result = dsl.run(options)

    expect(result).toBeDefined "stylus"
    expect(result.stylus).toBeDefined "filePattern"
    expect(result.stylus).toBeDefined "output"
    expect(result.stylus.filePattern.toString()).toEqual [ /\.styl$/ ].toString() # hack to reliably compare regexp
    expect(result.stylus.output).toEqual "build/web/css/main.css"

  it "should parse given config file", ->
    fileName = "conf.coffee"
    content = """
    # customize default buildPath
    # gets prepended to all output paths
    # defaults to 'build/'
    # buildPath('build/')

    # stitch dependencies
    dependencies = [
      'ConsoleDummy.js',
      'jquery-1.6.2.js',
      'underscore-1.1.7.js',
      'backbone-0.5.3.js'
    ]

    files([/\\.styl$/]).use('stylus').output('web/css/main.css')

    files(/\\.coffee$/, /src\\/.*\\.js$/, /\\.eco$/)
      .use('stitch', {minify: false, dependencies: dependencies})
      .output('web/js/app.js')
    """

    fs.writeFileSync fileName, content
    result = dsl.loadConfigFile(fileName)
    fs.unlinkSync fileName

    expect(result).toBeDefined "stitch"
    expect(result.stitch).toBeDefined "filePattern"
    expect(result.stitch).toBeDefined "output"
    expect(result.stitch).toBeDefined "minify"
    expect(result.stitch).toBeDefined "dependencies"
    expect(result.stitch.filePattern.toString()).toEqual [ /\.coffee$/, /src\/.*\.js$/, /\.eco$/ ].toString() # hack to reliably compare regexp
    expect(result.stitch.output).toEqual "build/web/js/app.js"
    expect(result.stitch.minify).toEqual false
    expect(result.stitch.dependencies).toEqual [ 'ConsoleDummy.js', 'jquery-1.6.2.js', 'underscore-1.1.7.js', 'backbone-0.5.3.js' ]

    expect(result).toBeDefined "stylus"
    expect(result.stylus).toBeDefined "filePattern"
    expect(result.stylus).toBeDefined "output"
    expect(result.stylus.filePattern.toString()).toEqual [ /\.styl$/ ].toString() # hack to reliably compare regexp
    expect(result.stylus.output).toEqual "build/web/css/main.css"

  it "should honor buildPath option", ->
    options = "buildPath('foo/')\n files([/\\.styl$/]).use('stylus').output('bar')"

    result = dsl.run(options)

    expect(result).toBeDefined "stylus"
    expect(result.stylus).toBeDefined "output"
    expect(result.stylus.output).toEqual "foo/bar"
