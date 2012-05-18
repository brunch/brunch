fs = require 'fs'
inflection = require 'inflection'
sysPath = require 'path'
common = require './common'
helpers = require '../helpers'
logger = require '../logger'

# The definition would be added on top of every filewriter .js file.
requireDefinitionCache = null
getRequireDefinition = (callback) ->
  return callback null, requireDefinitionCache if requireDefinitionCache?
  path = sysPath.join __dirname, '..', '..', 'vendor', 'require_definition.js'
  fs.readFile path, (error, result) ->
    return logger.error error if error?
    requireDefinitionCache = result.toString()
    callback null, requireDefinitionCache

# File which is generated by brunch from other files.
module.exports = class GeneratedFile
  # 
  # path        - path to file that will be generated.
  # sourceFiles - array of `fs_utils.SourceFile`-s.
  # config      - parsed application config.
  # 
  constructor: (@path, @sourceFiles, @config, minifiers) ->    
    @type = if @sourceFiles.some((file) -> file.type is 'javascript')
      'javascript'
    else
      'stylesheet'
    @minifier = minifiers.filter((minifier) => minifier.type is @type)[0]
    Object.freeze(this)

  _extractOrder: (files, config) ->
    types = files.map (file) -> inflection.pluralize file.type
    Object.keys(config.files)
      .filter (key) ->
        key in types
      # Extract order value from config.
      .map (key) ->
        config.files[key].order
      # Join orders together.
      .reduce (memo, array) ->
        array or= {}
        {
          before: memo.before.concat(array.before or []),
          after: memo.after.concat(array.after or [])
        }
      , {before: [], after: [], vendorPaths: config.paths.vendor}

  # Private: Collect content from a list of files and wrap it with
  # require.js module definition if needed.
  # Returns string.
  _joinSourceFiles: (callback) ->
    files = @sourceFiles
    paths = files.map (file) -> file.path
    order = @_extractOrder files, @config
    sourceFiles = helpers.sortByConfig(paths, order).map (file) ->
      files[paths.indexOf file]
    sortedPaths = sourceFiles.map((file) -> file.path).join(', ')
    logger.debug "Joining files '#{sortedPaths}' to '#{@path}'"
    joined = sourceFiles.map((file) -> file.cache.data).join('')
    if @type is 'javascript'
      getRequireDefinition (error, requireDefinition) =>
        callback null, requireDefinition + joined
    else
      callback null, joined

  # Private: minify data.
  # 
  # data     - string of js / css that will be minified.
  # callback - function that would be executed with (minifyError, data).
  # 
  # Returns nothing.
  _minify: (data, callback) ->
    if @config.minify and @minifier?.minify?
      @minifier.minify data, @path, callback
    else
      callback null, data

  # Joins data from source files, minifies it and writes result to 
  # path of current generated file.
  # 
  # callback - minify / write error or data of written file.
  # 
  # Returns nothing.
  write: (callback) ->
    @_joinSourceFiles (error, joined) =>
      return callback error if error?
      @_minify joined, (error, data) =>
        return callback error if error?
        common.writeFile @path, data, callback
