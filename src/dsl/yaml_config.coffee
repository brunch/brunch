_ = require "underscore"
yaml = require "yaml"
fs = require "fs"
path = require "path"
util = require "util"

dsl = require "./index"

class exports.YamlConfig
  constructor: (path, options) ->
    @path = path
    @options = options
    @data = yaml.eval fs.readFileSync(path, "utf8")

  toOptions: ->
    _.defaults(@data, @options.stitch)
    @data.buildPath ?= 'build'

    config_string = """
      buildPath('#{@data.buildPath}')
      files([/\\.styl$/]).use('stylus').output('web/css/main.css')
      files([/\\.coffee$/, /src\\/.*\\.js$/, new RegExp("#{@data.templateExtension}$")])
        .use('stitch', { minify: #{@data.minify}, dependencies: #{util.inspect @data.dependencies} })
        .output('web/js/app.js')
    """

    dsl.run config_string
