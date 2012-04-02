async = require 'async'
{EventEmitter} = require 'events'
sysPath = require 'path'
helpers = require '../helpers'
GeneratedFile = require './generated_file'
logger = require '../logger'

# A bridge between `GeneratedFile` and `SourceFileList`.
module.exports = class FileWriter extends EventEmitter
  # * config  - parsed app config
  # * plugins - hashmap of plugins from package.json.
  constructor: (@config, @plugins) ->
    @destFiles = []
    @_initFilesConfig @config.files

  # config.files[type].joinTo can be string, map of (str -> regExp)
  # or map of (str -> fn). This converts all cases to one interface
  # (str -> fn).
  _initFilesConfig: (filesConfig) ->
    config = filesConfig
    Object.keys(config).forEach (type) =>
      data = config[type]
      if typeof data.joinTo is 'string'
        object = {}
        object[data.joinTo] = /.+/
        data.joinTo = object
      Object.keys(data.joinTo).forEach (destinationPath) =>
        regExpOrFunction = data.joinTo[destinationPath]
        data.joinTo[destinationPath] = if regExpOrFunction instanceof RegExp
          (string) ->
            regExpOrFunction.test string
        else
          regExpOrFunction
    config

  _getDestinationPathes: (file) ->
    data = @config.files[helpers.pluralize file.type]
    pathes = Object.keys(data.joinTo).filter (destinationPath) ->
      checkingFunction = data.joinTo[destinationPath]
      checkingFunction file.path
    if pathes.length > 0 then pathes else null

  _getFiles: (fileList, minifiers) ->
    map = {}
    fileList.files.forEach (file) =>
      pathes = @_getDestinationPathes file
      return unless pathes?
      pathes.forEach (path) =>
        map[path] ?= []
        map[path].push file
    Object.keys(map).map (generatedFilePath) =>
      sourceFiles = map[generatedFilePath]
      fullPath = sysPath.join @config.buildPath, generatedFilePath
      file = new GeneratedFile fullPath, sourceFiles, @config
      minifiers
        .filter (minifier) ->
          minifier.type is file.type
        .forEach (minifier) ->
          file.minifier = minifier
      file

  write: (fileList) =>
    files = @_getFiles fileList, @plugins.filter (plugin) -> !!plugin.minify
    write = (file, callback) -> file.write callback
    async.forEach files, write, (error, results) =>
      return logger.error "write error. #{error}" if error?
      @emit 'write', results
