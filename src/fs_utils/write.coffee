'use strict'

async = require 'async'
sysPath = require 'path'
inflection = require 'inflection'
GeneratedFile = require './generated_file'

getGeneratedFilesPaths = (sourceFile, joinConfig) ->
  sourceFileJoinConfig = joinConfig[inflection.pluralize sourceFile.type] or {}
  Object.keys(sourceFileJoinConfig).filter (generatedFilePath) ->
    checker = sourceFileJoinConfig[generatedFilePath]
    checker sourceFile.path

getFiles = (fileList, config, joinConfig, minifiers) ->
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
module.exports = write = (fileList, config, joinConfig, plugins, startTime, callback) ->
  minifiers = plugins.filter (plugin) -> !!plugin.minify
  files = getFiles fileList, config, joinConfig, minifiers
  changed = files.filter (generatedFile) ->
    generatedFile.sourceFiles.some (sourceFile) ->
      sourceFile.cache.compilationTime > startTime
  async.forEach changed, ((file) -> file.write callback), (error) ->
    return callback error if error?
    callback null, changed
