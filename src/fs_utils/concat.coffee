debug = require('debug')('brunch:concat')

sysPath = require 'path'

{SourceMapConsumer, SourceMapGenerator, SourceNode} = require 'source-map'

toNode = (file) ->
  if typeof file.data is 'string'
    code = file.data
    node = new SourceNode null, null, file.path
    node.setSourceContent file.path, code
  else
    code = file.data.compiled
    node = SourceNode.fromStringWithSourceMap(
      code,
      new SourceMapConsumer file.data.map
    )
  node


concat = (files, path, type, wrapper)->

 # nodes = files.map toNode
  root = new SourceNode()

  files.forEach ( file ) ->

    if typeof file.data is 'string'
      code = file.data
      node = new SourceNode 1, 0, file.path, code
    else
      code = file.data.compiled
      node = SourceNode.fromStringWithSourceMap(
        code,
        new SourceMapConsumer file.data.map
      )
    root.add node
    root.setSourceContent file.path, file.source

  root.walkSourceContents ( path, content )->
    debug path

  root.toStringWithSourceMap file:path

module.exports = concat