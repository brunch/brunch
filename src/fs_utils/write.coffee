'use strict'

async = require 'async'
sysPath = require 'path'
inflection = require 'inflection'
GeneratedFile = require './generated_file'
helpers = require '../helpers'

getPaths = (sourceFile, joinConfig) ->
  sourceFileJoinConfig = joinConfig[inflection.pluralize sourceFile.type] or {}
  Object.keys(sourceFileJoinConfig).filter (generatedFilePath) ->
    checker = sourceFileJoinConfig[generatedFilePath]
    checker sourceFile.path

getFiles = (fileList, config, joinConfig, minifiers) ->
  map = {}

  fileList.files.forEach (file) ->
    paths = getPaths file, joinConfig
    paths.forEach (path) ->
      map[path] ?= []
      map[path].push file

  Object.keys(map).map (generatedFilePath) ->
    sourceFiles = map[generatedFilePath]
    fullPath = sysPath.join config.paths.public, generatedFilePath
    new GeneratedFile fullPath, sourceFiles, config, minifiers

changedSince = (startTime) -> (generatedFile) ->
  generatedFile.sourceFiles.some (sourceFile) ->
    sourceFile.cache.compilationTime >= startTime

gatherErrors = (generatedFiles) ->
  errors = []
  generatedFiles
    .forEach (generatedFile) ->
      generatedFile.sourceFiles
        .filter (sourceFile) ->
          sourceFile.cache.error?
        .forEach (sourceFile) ->
          cache = sourceFile.cache
          errors.push helpers.formatError cache.error, sourceFile.path

  if errors.length > 0
    errors
  else
    null

module.exports = write = (fileList, config, joinConfig, minifiers, startTime, callback) ->
  files = getFiles fileList, config, joinConfig, minifiers
  changed = files.filter(changedSince startTime)
  error = gatherErrors files
  return callback error if error?
  async.forEach changed, ((file, next) -> file.write next), (error) ->
    return callback error if error?
    callback null, changed
