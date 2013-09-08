'use strict'

debug = require('debug')('brunch:source-file')
sysPath = require 'path'
os = require 'os'
{pipeline} = require './pipeline'
{identityNode, replaceBackSlashes, isWindows} = require '../helpers'
{SourceMapConsumer, SourceMapGenerator, SourceNode} = require 'source-map'

updateMap = (path, compiled, wrapped, sourceMap) ->
  #console.log wrapped
  if sourceMap
    debug "Generated source map for '#{path}': " + JSON.stringify sourceMap

  if typeof wrapped is 'object'
    {prefix, suffix} = wrapped
    wrapperContent = wrapped.data or compiled
  else
    sourcePos = wrapped.indexOf compiled
    wrapperContent = if sourcePos > 0 then compiled else wrapped
    prefix = wrapped.slice 0, sourcePos
    suffix = wrapped.slice sourcePos + compiled.length

  node = if sourceMap?
    mapping = if typeof sourceMap is 'string'
      JSON.parse sourceMap.replace /^\)\]\}'/, ''
    else
      sourceMap
    if isWindows and mapping.sources
      mapping.sources = mapping.sources.map(replaceBackSlashes)
    map = new SourceMapConsumer mapping
    SourceNode.fromStringWithSourceMap wrapperContent, map
  else
    identityNode wrapperContent, path

  node.isIdentity = not sourceMap?

  node.prepend prefix if prefix
  node.add suffix if suffix
  node.source = path
  node.setSourceContent path, wrapperContent

  node

updateCache = (path, cache, error, result, wrap) ->
  if error?
    cache.error = error
    return cache
  if not result?
    cache.error = null
    cache.data = null
    cache.compilationTime = Date.now()
    return cache

  cache.error = null
  cache.dependencies = result.dependencies
  cache.source = result.source
  cache.compilationTime = Date.now()
  cache.data = result.compiled
  compiled = result.compiled
  cache.node = updateMap path, compiled, (wrap compiled), result.sourceMap
  cache

makeWrapper = (wrapper, path, isWrapped, isntModule) ->
  (node) ->
    if isWrapped then wrapper path, node, isntModule else node

makeCompiler = (path, cache, linters, compilers, wrap, workers) ->
  normalizedPath = replaceBackSlashes path
  (callback) ->
    postCompile = (error, data) ->
      updateCache normalizedPath, cache, error, data, wrap
      callback error, cache.data
    if workers?.list?.length
      messageHandler = ([msg]) ->
        return unless msg.path is path
        this.removeListener 'message', messageHandler
        msg.compiled = msg.data
        postCompile msg.error, msg
      workers.list[0].on('message', messageHandler).send(path)
    else
      pipeline path, linters, compilers, postCompile

# A file that will be compiled by brunch.
module.exports = class SourceFile
  constructor: (@path, compilers, linters, wrapper, workers, @isHelper, isVendor) ->
    compiler = compilers[0]
    isntModule = @isHelper or isVendor
    isWrapped = compiler.type in ['javascript', 'template']

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
    @compile = makeCompiler @path, this, linters, compilers, wrap, workers

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
