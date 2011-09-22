_ = require "underscore"
yaml = require "yaml"
fs = require "fs"
path = require "path"
util = require "util"

dsl = require "./index"

class exports.YamlConfig
  constructor: (path) ->
    @path = path
    @data = yaml.eval fs.readFileSync(path, "utf8")

  toOptions: ->
    @data.buildPath ?= 'build'
    additionalRegexp = new RegExp("#{@data.templateExtension}$") if @data.templateExtension?

    config_string = """
      buildPath('#{@data.buildPath}')
      files([/\\.styl$/]).use('stylus').output('web/css/main.css')
      files([/\\.coffee$/, /src\\/.*\\.js$/#{if additionalRegexp then (', ' + additionalRegexp) else ''}])
        .use('stitch', { minify: #{@data.minify}, dependencies: #{util.inspect @data.dependencies} })
        .output('web/js/app.js')
    """

    dsl.run config_string
