'use strict'

async = require 'async'
debug = require('debug')('brunch:source-file')
fs = require 'fs'
sysPath = require 'path'
logger = require 'loggy'

# Run all linters.
lint = (data, path, linters, callback) ->
  if linters.length is 0
    callback null
  else
    async.forEach linters, (linter, callback) ->
      linter.lint data, path, callback
    , callback

# Extract files that depend on current file.
getDependencies = (data, path, compiler, callback) ->
  if compiler.getDependencies
    compiler.getDependencies data, path, callback
  else
    callback null, []

pipeline = (realPath, path, linters, compiler, callback) ->
  callbackError = (type, stringOrError) =>
    string = if stringOrError instanceof Error
      stringOrError.toString().slice(7)
    else
      stringOrError
    error = new Error string
    error.brunchType = type
    callback error

  fs.readFile realPath, 'utf-8', (error, data) =>
    return callbackError 'Reading', error if error?
    lint data, path, linters, (error) =>
      if error?.match /^warn\:\s/i
        logger.warn "Linting of #{path}: #{error}"
      else
        return callbackError 'Linting', error if error?
      compiler.compile data, path, (error, compiled) =>
        return callbackError 'Compiling', error if error?
        getDependencies data, path, compiler, (error, dependencies) =>
          return callbackError 'Dependency parsing', error if error?
          callback null, {dependencies, compiled}

updateCache = (cache, error, result, wrap) ->
  if error?
    cache.error = error
  else
    {dependencies, compiled} = result
    cache.error = null
    cache.dependencies = dependencies
    cache.compilationTime = Date.now()
    cache.data = wrap compiled if compiled?
  cache

makeWrapper = (wrapper, path, isWrapped, isntModule) ->
  (data) ->
    if isWrapped then wrapper path, data, isntModule else data

makeCompiler = (realPath, path, cache, linters, compiler, wrap) ->
  (callback) ->
    pipeline realPath, path, linters, compiler, (error, data) =>
      updateCache cache, error, data, wrap
      return callback error if error?
      callback null, cache.data

# A file that will be compiled by brunch.
module.exports = class SourceFile
  constructor: (path, compiler, linters, wrapper, isHelper, isVendor) ->
    isntModule = isHelper or isVendor
    isWrapped = compiler.type in ['javascript', 'template']

    # If current file is provided by brunch plugin, use fake path.
    realPath = path
    @path = if isHelper
      compilerName = compiler.constructor.name
      fileName = "brunch-#{compilerName}-#{sysPath.basename realPath}"
      sysPath.join 'vendor', 'scripts', fileName
    else
      path
    @type = compiler.type
    wrap = makeWrapper wrapper, @path, isWrapped, isntModule
    @data = ''
    @dependencies = []
    @compilationTime = null
    @error = null
    @removed = false
    @disposed = false
    @compile = makeCompiler realPath, @path, this, linters, compiler, wrap

    debug "Initializing fs_utils.SourceFile: %s", JSON.stringify {
      @path, isntModule, isWrapped
    }
    Object.seal this

  dispose: ->
    debug "Disposing file '#{@path}'"
    @path = ''
    @data = ''
    @dependencies = []
    @disposed = true
    Object.freeze this
