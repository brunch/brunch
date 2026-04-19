iced = require 'iced-coffee-script'

module.exports = class IcedCoffeeScriptCompiler
  brunchPlugin: yes
  type: 'javascript'

  constructor: (@config) ->
    cfg = @config.plugins?.icedCoffeeScript ? {}
    @extension = cfg.extension ? 'iced'
    null

  compile: (data, path, callback) ->
    options =
      bare: @config?.plugins?.iced?.bare
      sourceMap: Boolean @config?.sourceMaps
      sourceFiles: [path]
      runtime: 'window'

    try
      compiled = iced.compile data, options
    catch err
      error = if err.location?
        "#{err.location.first_line}:#{err.location.first_column} #{err.toString()}"
      else
        err.toString()
    finally
      return callback error if error?
      result = if compiled and options.sourceMap
        data: compiled.js
        map: compiled.v3SourceMap
      else
        data: compiled
      callback error, result
