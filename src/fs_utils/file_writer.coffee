async = require 'async'
{EventEmitter} = require 'events'
sysPath = require 'path'
helpers = require '../helpers'
GeneratedFile = require './generated_file'
logger = require '../logger'

makeChecker = (item) ->
  switch toString.call(item)
    when '[object RegExp]'
      ((string) -> item.test string)
    when '[object Function]'
      item
    else
      throw new Error("Config.files item #{item} is invalid.
Use RegExp or Function.")

# Converts `config.files[...].joinTo` to one format.
getJoinConfig = (config) ->
  joinConfig = {}
  types = Object.keys(config.files)
  types
    .map (type) =>
      config.files[type].joinTo
    .map (joinTo) =>
      if typeof joinTo is 'string'
        object = {}
        object[joinTo] = /.+/
        object
      else
        joinTo
    .forEach (joinTo, index) =>
      cloned = {}
      Object.keys(joinTo).forEach (generatedFilePath) =>
        cloned[generatedFilePath] = makeChecker joinTo[generatedFilePath]
      joinConfig[types[index]] = cloned
  Object.freeze(joinConfig)

getGeneratedFilesPaths = (sourceFile, joinConfig) ->
  joinConfig = joinConfig[helpers.pluralize sourceFile.type]
  Object.keys(joinConfig).filter (generatedFilePath) ->
    checker = joinConfig[generatedFilePath]
    checker sourceFile.path

# A bridge between `GeneratedFile` and `SourceFileList`.
module.exports = class FileWriter extends EventEmitter
  # * config  - parsed app config
  # * plugins - hashmap of plugins from package.json.
  constructor: (@config, @plugins) ->
    @destFiles = []
    @joinConfig = getJoinConfig config

  _getFiles: (fileList, minifiers) ->    
    map = {}
    fileList.files.forEach (file) =>
      paths = getGeneratedFilesPaths file, @joinConfig
      paths.forEach (path) =>
        map[path] ?= []
        map[path].push file

    Object.keys(map).map (generatedFilePath) =>
      sourceFiles = map[generatedFilePath]
      fullPath = sysPath.join @config.paths.build, generatedFilePath
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
