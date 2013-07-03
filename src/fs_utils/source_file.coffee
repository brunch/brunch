'use strict'

each = require 'async-each'
waterfall = require 'async-waterfall'
debug = require('debug')('brunch:source-file')
fs = require 'fs'
sysPath = require 'path'
logger = require 'loggy'
nodeFactory = require('../helpers').identityNode
{SourceMapConsumer, SourceMapGenerator, SourceNode} = require 'source-map'

# Run all linters.
lint = (data, path, linters, callback) ->
  if linters.length is 0
    callback null
  else
    each linters, (linter, callback) ->
      linter.lint data, path, callback
    , callback

# Extract files that depend on current file.
getDependencies = (data, path, compiler, callback) ->
  if compiler.getDependencies
    compiler.getDependencies data, path, callback
  else
    callback null, []

pipeline = (realPath, path, linters, compilers, callback) ->
  callbackError = (type, stringOrError) =>
    string = if stringOrError instanceof Error
      stringOrError.toString().replace /^([^:]+:\s+)/, ''
    else
      stringOrError
    error = new Error string
    error.brunchType = type
    callback error

  fs.readFile realPath, 'utf-8', (error, source) =>
    return callbackError 'Reading', error if error?
    lint source, path, linters, (error) =>
      if error?.match /^warn\:\s/i
        logger.warn "Linting of #{path}: #{error}"
      else
        return callbackError 'Linting', error if error?
      chained = compilers.map (compiler) =>
        ({dependencies, compiled, source, sourceMap, path}, next) =>
          compiler.compile compiled or source, path, (error, compiledData) =>
            return callbackError 'Compiling', error if error?
            # compiler is able to produce sourceMap
            if typeof compiledData is 'object'
              sourceMap = compiledData.map
              compiled = compiledData.code
            else
              compiled = compiledData
            getDependencies source, path, compiler, (error, dependencies) =>
              return callbackError 'Dependency parsing', error if error?
              next null, {dependencies, compiled, source, sourceMap, path}
      chained.unshift (next) -> next null, {source, path}
      waterfall chained, callback

updateCache = (realPath, cache, error, result, wrap) ->
  if error?
    cache.error = error
  else
    {dependencies, compiled, source, sourceMap} = result
    if sourceMap
      debug "Generated source map for '#{realPath}': " + JSON.stringify sourceMap

    cache.error = null
    cache.dependencies = dependencies
    cache.source = source
    cache.compilationTime = Date.now()

    wrapped = wrap compiled

    if typeof wrapped is 'object'
      {prefix, suffix} = wrapped
      nodeData = wrapped.data or compiled
    else
      sourcePos = wrapped.indexOf compiled
      nodeData = if sourcePos > 0 then compiled else wrapped
      prefix = wrapped.slice 0, sourcePos
      suffix = wrapped.slice sourcePos + compiled.length

    cache.node = if sourceMap?
      map = new SourceMapConsumer sourceMap
      SourceNode.fromStringWithSourceMap nodeData, map
    else
      nodeFactory nodeData, realPath

    cache.node.prepend prefix if prefix
    cache.node.add suffix if suffix

    cache.node.source = realPath
    cache.node.setSourceContent realPath, source

  cache

makeWrapper = (wrapper, path, isWrapped, isntModule) ->
  (node) ->
    if isWrapped then wrapper path, node, isntModule else node

makeCompiler = (realPath, path, cache, linters, compilers, wrap) ->
  (callback) ->
    pipeline realPath, path, linters, compilers, (error, data) =>
      updateCache realPath, cache, error, data, wrap
      return callback error if error?
      callback null, cache.data

# A file that will be compiled by brunch.
module.exports = class SourceFile
  constructor: (path, compilers, linters, wrapper, isHelper, isVendor) ->
    compiler = compilers[0]
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
    @source = null
    @data = ''
    @node = null
    @dependencies = []
    @compilationTime = null
    @error = null
    @removed = false
    @disposed = false
    @compile = makeCompiler realPath, @path, this, linters, compilers, wrap

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
