'use strict'

each = require 'async-each'
sysPath = require 'path'
generate = require './generate'
helpers = require '../helpers'

getPaths = (sourceFile, joinConfig) ->
  sourceFileJoinConfig = joinConfig[sourceFile.type + 's'] or {}
  Object.keys(sourceFileJoinConfig).filter (generatedFilePath) ->
    checker = sourceFileJoinConfig[generatedFilePath]
    checker sourceFile.path

getFiles = (fileList, config, joinConfig) ->
  map = {}

  fileList.files.forEach (file) ->
    return if not file.error? and not file.data?
    paths = getPaths file, joinConfig
    paths.forEach (path) ->
      map[path] ?= []
      map[path].push file

  Object.keys(map).map (generatedFilePath) ->
    sourceFiles = map[generatedFilePath]
    fullPath = sysPath.join config.paths.public, generatedFilePath
    {sourceFiles, path: fullPath}

changedSince = (startTime) -> (generated) ->
  generated.sourceFiles.some (sourceFile) ->
    sourceFile.compilationTime >= startTime or sourceFile.removed

formatError = (sourceFile) ->
  helpers.formatError sourceFile.error, sourceFile.path

module.exports = write = (fileList, config, joinConfig, optimizers, startTime, callback) ->
  files = getFiles fileList, config, joinConfig
  errors = files
    .map (generated) ->
      generated.sourceFiles.filter((_) -> _.error?).map(formatError)
    .reduce(((a, b) -> a.concat b), [])
  return callback errors.join(' ; ') if errors.length > 0  # callback errors

  changed = files.filter(changedSince startTime)

  # Remove files marked as such and dispose them, clean memory.
  changed.forEach (generated) ->
    sourceFiles = generated.sourceFiles
    sourceFiles
      .filter (file) ->
        file.removed
      .forEach (file) ->
        sourceFiles.splice sourceFiles.indexOf(file), 1

  gen = (file, next) ->
    generate file.path, file.sourceFiles, config, optimizers, next
  each changed, gen, (error) ->
    return callback error if error?
    callback null, changed
