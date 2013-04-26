'use strict'

async = require 'async'
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
    sourceFile.compilationTime >= startTime

formatError = (sourceFile) ->
  helpers.formatError sourceFile.error, sourceFile.path

module.exports = write = (fileList, config, joinConfig, minifiers, startTime, callback) ->
  files = getFiles fileList, config, joinConfig
  errors = files
    .map (generated) ->
      generated.sourceFiles.filter((_) -> _.error?).map(formatError)
    .reduce(((a, b) -> a.concat b), [])
  return callback errors.join(' ; ') if errors.length > 0  # callback errors
  changed = files.filter(changedSince startTime)
  gen = (file, next) ->
    generate file.path, file.sourceFiles, config, minifiers, next
  async.forEach changed, gen, (error) ->
    return callback error if error?
    callback null, changed
