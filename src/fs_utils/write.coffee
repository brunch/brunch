'use strict'

each = require 'async-each'
sysPath = require 'path'
generate = require './generate'
helpers = require '../helpers'
logger = require 'loggy'
anymatch = require 'anymatch'

getPaths = (sourceFile, joinConfig) ->
  sourceFileJoinConfig = joinConfig[sourceFile.type + 's'] or {}
  Object.keys(sourceFileJoinConfig)
    .filter (key) ->
      key isnt 'pluginHelpers'
    .filter (generatedFilePath) ->
      if sourceFile.isHelper
        generatedFilePath in sourceFileJoinConfig.pluginHelpers
      else
        checker = sourceFileJoinConfig[generatedFilePath]
        checker sourceFile.path

getFiles = (fileList, config, joinConfig, startTime) ->
  map = {}

  anyJoinTo = {}
  checkAnyJoinTo = (file) ->
    joinSpecs = anyJoinTo[file.type] ?=
      Object.keys(config.overrides).map (_) ->
        config.overrides[_].files
      ## config.files was copied to config.overrides._default.files
      #.concat [config.files]
      .map (_) -> _?["#{file.type}s"]?.joinTo
      .filter (_) -> _

    if typeof joinSpecs is 'function'
      joinSpecs file.path
    else if joinSpecs.some((_) -> typeof _ is 'string')
      anyJoinTo[file.type] = -> true
    else if not joinSpecs.length
      anyJoinTo[file.type] = -> false
      false
    else
      anyJoinTo[file.type] = anymatch joinSpecs.reduce (flat, aJoinTo) ->
        flat.concat Object.keys(aJoinTo).map (_) -> aJoinTo[_]
      , []
      anyJoinTo[file.type] file.path

  fileList.files.forEach (file) ->
    return if not file.error? and not file.data?
    paths = getPaths file, joinConfig
    paths.forEach (path) ->
      map[path] ?= []
      map[path].push file
    unless paths.length
      if file.error
        logger.error formatError file
      if file.data and file.compilationTime >= startTime
        unless checkAnyJoinTo file
          logger.warn "'#{file.path}' compiled, but not written. Check your #{file.type}s.joinTo config."

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
  files = getFiles fileList, config, joinConfig, startTime
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
