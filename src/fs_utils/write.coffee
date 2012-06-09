'use strict'

async = require 'async'
sysPath = require 'path'
inflection = require 'inflection'
GeneratedFile = require './generated_file'
logger = require '../logger'

makeUniversalChecker = (item) ->
  switch toString.call(item)
    when '[object RegExp]'
      ((string) -> item.test string)
    when '[object Function]'
      item
    else
      throw new Error("Config.files item #{item} is invalid.
Use RegExp or Function.")

listToObj = (acc, elem) ->
  acc[elem[0]] = elem[1]
  acc

# Converts `config.files[...].joinTo` to one format.
getJoinConfig = (config) ->
  types = Object.keys(config.files)
  result = types
    .map (type) =>
      config.files[type].joinTo
    .map (joinTo) =>
      if typeof joinTo is 'string'
        object = {}
        object[joinTo] = /.+/
        object
      else
        joinTo
    .map (joinTo, index) =>
      makeChecker = (generatedFilePath) =>
        [generatedFilePath, makeUniversalChecker(joinTo[generatedFilePath])]
      subConfig = Object.keys(joinTo).map(makeChecker).reduce(listToObj, {})
      [types[index], subConfig]
    .reduce(listToObj, {})
  Object.freeze(result)

getGeneratedFilesPaths = (sourceFile, joinConfig) ->
  sourceFileJoinConfig = joinConfig[inflection.pluralize sourceFile.type] or {}
  Object.keys(sourceFileJoinConfig).filter (generatedFilePath) ->
    checker = sourceFileJoinConfig[generatedFilePath]
    checker sourceFile.path

getFiles = (fileList, config, minifiers) ->
  joinConfig = getJoinConfig config
  map = {}
  fileList.files.forEach (file) =>
    paths = getGeneratedFilesPaths file, joinConfig
    paths.forEach (path) =>
      map[path] ?= []
      map[path].push file

  Object.keys(map).map (generatedFilePath) =>
    sourceFiles = map[generatedFilePath]
    fullPath = sysPath.join config.paths.public, generatedFilePath
    new GeneratedFile fullPath, sourceFiles, config, minifiers

# * plugins - hashmap of plugins from package.json.
module.exports = write = (fileList, config, plugins, callback) ->
  minifiers = plugins.filter (plugin) -> !!plugin.minify
  files = getFiles fileList, config, minifiers
  writeFile = (file, callback) -> file.write callback
  async.forEach files, writeFile, (error, results) ->
    return callback error if error?
    callback null, results
