'use strict'

each = require 'async-each'
sysPath = require 'path'
generate = require './generate'
helpers = require '../helpers'
anysort = require 'anysort'

typeToGroup = (type) -> "#{type}s"

getPaths = (sourceFile, joinConfig) ->
  sourceFileJoinConfig = joinConfig[typeToGroup sourceFile.type] or {}
  Object.keys(sourceFileJoinConfig)
    .filter (key) ->
      key isnt 'pluginHelpers'
    .filter (generatedFilePath) ->
      if sourceFile.isHelper
        sourceFileJoinConfig.pluginHelpers is generatedFilePath
      else
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

  for path, sourceFiles of map
    sourceFiles.sort (a, b) ->
      anysort a.path, b.path, config.files[typeToGroup a.type].joinTo[path]

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
  disposed = generated: [], sourcePaths: []
  changed.forEach (generated) ->
    sourceFiles = generated.sourceFiles
    sourceFiles
      .filter (file) ->
        file.removed
      .forEach (file) ->
        disposed.generated.push generated
        disposed.sourcePaths.push sysPath.basename file.path
        file.dispose()
        sourceFiles.splice sourceFiles.indexOf(file), 1

  gen = (file, next) ->
    generate file.path, file.sourceFiles, config, optimizers, next
  each changed, gen, (error) ->
    return callback error if error?
    callback null, changed, disposed
