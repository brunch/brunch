async = require 'async'
sysPath = require 'path'
inflection = require 'inflection'
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
    |> map (type) ->
      config.files[type].joinTo
    |> map (joinTo) ->
      if typeof joinTo is 'string'
        object = {}
        object[joinTo] = /.+/
        object
      else
        joinTo
    |> forEach (joinTo, index) ->
      cloned = {}
      Object.keys(joinTo).forEach (generatedFilePath) ->
        cloned[generatedFilePath] = makeChecker joinTo[generatedFilePath]
      joinConfig[types[index]] = cloned
  Object.freeze(joinConfig)

getGeneratedFilesPaths = (sourceFile, joinConfig) ->
  sourceFileJoinConfig = joinConfig[inflection.pluralize sourceFile.type] or {}
  Object.keys(sourceFileJoinConfig).filter (generatedFilePath) ->
    checker = sourceFileJoinConfig[generatedFilePath]
    checker sourceFile.path

getFiles = (fileList, config, minifiers) ->
  joinConfig = getJoinConfig config
  map = {}
  fileList.files.forEach (file) ~>
    paths = getGeneratedFilesPaths file, joinConfig
    paths.forEach (path) ~>
      map[path] ?= []
      map[path].push file

  Object.keys(map).map (generatedFilePath) ~>
    sourceFiles = map[generatedFilePath]
    fullPath = sysPath.join config.paths.public, generatedFilePath
    new GeneratedFile fullPath, sourceFiles, config, minifiers

# * plugins - hashmap of plugins from package.json.
module.exports = write = (fileList, config, plugins, callback) ->
  minifiers = plugins |> filter (plugin) -> Boolean plugin.minify
  files = getFiles fileList, config, minifiers
  writeFile = (file, callback) -> file.write callback
  error, results <- async.forEach files, writeFile
  callback error, results
