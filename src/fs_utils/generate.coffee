'use strict'

debug = require('debug')('brunch:generate')
fs = require 'fs'
sysPath = require 'path'
common = require './common'
{SourceMapConsumer, SourceMapGenerator, SourceNode} = require 'source-map'

sortAlphabetically = (a, b) ->
  if a < b
    -1
  else if a > b
    1
  else
    0

# If item path starts with 'vendor', it has bigger priority.
sortByVendor = (config, a, b) ->
  aIsVendor = config.vendorConvention a
  bIsVendor = config.vendorConvention b
  if aIsVendor and not bIsVendor
    -1
  else if not aIsVendor and bIsVendor
    1
  else
    # All conditions were false, we don't care about order of
    # these two items.
    sortAlphabetically a, b

# Items wasn't found in config.before, try to find then in
# config.after.
# Item that config.after contains would have lower sorting index.
sortByAfter = (config, a, b) ->
  indexOfA = config.after.indexOf a
  indexOfB = config.after.indexOf b
  [hasA, hasB] = [(indexOfA isnt -1), (indexOfB isnt -1)]
  if hasA and not hasB
    1
  else if not hasA and hasB
    -1
  else if hasA and hasB
    indexOfA - indexOfB
  else
    sortByVendor config, a, b

# Try to find items in config.before.
# Item that config.after contains would have bigger sorting index.
sortByBefore = (config, a, b) ->
  indexOfA = config.before.indexOf a
  indexOfB = config.before.indexOf b
  [hasA, hasB] = [(indexOfA isnt -1), (indexOfB isnt -1)]
  if hasA and not hasB
    -1
  else if not hasA and hasB
    1
  else if hasA and hasB
    indexOfA - indexOfB
  else
    sortByAfter config, a, b

# Sorts by pattern.
#
# Examples
#
#   sort ['b.coffee', 'c.coffee', 'a.coffee'],
#     before: ['a.coffee'], after: ['b.coffee']
#   # => ['a.coffee', 'c.coffee', 'b.coffee']
#
# Returns new sorted array.
sortByConfig = (files, config) ->
  if toString.call(config) is '[object Object]'
    cfg =
      before: config.before ? []
      after: config.after ? []
      vendorConvention: (config.vendorConvention ? -> no)
    files.slice().sort (a, b) -> sortByBefore cfg, a, b
  else
    files

flatten = (array) ->
  array.reduce (acc, elem) ->
    acc.concat(if Array.isArray(elem) then flatten(elem) else [elem])
  , []

extractOrder = (files, config) ->
  types = files.map (file) -> file.type + 's'
  orders = Object.keys(config.files)
    .filter (key) ->
      key in types
    .map (key) ->
      config.files[key].order ? {}

  before = flatten orders.map (type) -> (type.before ? [])
  after = flatten orders.map (type) -> (type.after ? [])
  vendorConvention = config._normalized.conventions.vendor
  {before, after, vendorConvention}

sort = (files, config) ->
  paths = files.map (file) -> file.path
  indexes = Object.create(null)
  files.forEach (file, index) -> indexes[file.path] = file
  order = extractOrder files, config
  sortByConfig(paths, order).map (path) ->
    indexes[path]

# New.
concat = (files, path, type, definition) ->
  # nodes = files.map toNode
  root = new SourceNode()
  debug path
  files.forEach (file) ->
    root.add file.node
    #debug JSON.stringify(file.node)
    root.setSourceContent file.node.source, file.source

  root.prepend definition() if type is 'javascript'
  root.toStringWithSourceMap file: path

optimize = (data, smap, path, optimizer, isEnabled, callback) ->
  if isEnabled
    (optimizer.optimize or optimizer.minify) data, path, (error, result) ->
      if typeof result isnt 'string' # we have sourcemap
        {code, map} = result
        smConsumer = new SourceMapConsumer smap.toJSON()
        map = SourceMapGenerator.fromSourceMap new SourceMapConsumer map
        map._sources.add path
        map._mappings.forEach (mapping) ->
          mapping.source = path
        map.applySourceMap smConsumer
        result = code
      callback error, result, map
  else
    callback null, data, smap

generate = (path, sourceFiles, config, optimizers, callback) ->
  type = if sourceFiles.some((file) -> file.type is 'javascript')
    'javascript'
  else
    'stylesheet'
  optimizer = optimizers.filter((optimizer) -> optimizer.type is type)[0]

  sorted = sort sourceFiles, config
  {code, map} = concat sorted, path, type, config._normalized.modules.definition


  optimize code, map, path, optimizer, config.optimize, (error, data, map) ->
    return callback error if error?

    if map
      base = sysPath.basename "#{path}.map"
      if type is 'javascript'
        data += "\n//@ sourceMappingURL=#{base}"
      else
        data += "\n/*@ sourceMappingURL=#{base}*/"

    common.writeFile path, data, ->
      if map and config.modules.sourceMaps
        common.writeFile "#{path}.map", map.toString(), callback
      else
        callback()

generate.sortByConfig = sortByConfig
module.exports = generate
