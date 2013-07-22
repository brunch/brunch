'use strict'

debug = require('debug')('brunch:source-file')
sysPath = require 'path'
os = require 'os'
{pipeline} = require './pipeline'
{identityNode, replaceBackSlashes} = require '../helpers'
{SourceMapConsumer, SourceMapGenerator, SourceNode} = require 'source-map'

isWindows = os.platform() is 'win32'

updateCache = (realPath, cache, error, result, wrap) ->
  if error?
    cache.error = error
  else if not result?
    cache.error = null
    cache.data = null
    cache.compilationTime = Date.now()
  else
    {dependencies, compiled, source, sourceMap} = result
    filePath = replaceBackSlashes realPath
    if sourceMap
      debug "Generated source map for '#{filePath}': " + JSON.stringify sourceMap

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
      mapping = if typeof sourceMap is 'string'
        JSON.parse sourceMap.replace /^\)\]\}'/, ''
      else
        sourceMap
      mapping.sources = mapping.sources.map(replaceBackSlashes) if isWindows and mapping.sources
      map = new SourceMapConsumer mapping
      SourceNode.fromStringWithSourceMap nodeData, map
    else
      identityNode nodeData, filePath

    cache.node.prepend prefix if prefix
    cache.node.add suffix if suffix

    cache.node.source = filePath
    cache.node.setSourceContent filePath, source

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
    @source = null
    @data = ''
    @node = null
    @dependencies = []
    @compilationTime = null
    @error = null
    @removed = false
    @disposed = false

    wrap = makeWrapper wrapper, @path, isWrapped, isntModule
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
