'use strict'

debug = require('debug')('brunch:generate')
fs = require 'fs'
sysPath = require 'path'
waterfall = require 'async-waterfall'
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

sortBowerComponents = (config, a, b) ->
  aLevel = config.bowerMapping[a]
  bLevel = config.bowerMapping[b]
  if aLevel? and not bLevel?
    -1
  else if not aLevel? and bLevel?
    1
  else if aLevel? and bLevel?
    bLevel - aLevel
  else
    sortByBefore config, a, b

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
      bowerMapping: config.bowerMapping ? {}
    files.slice().sort (a, b) -> sortBowerComponents cfg, a, b
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
  {before, after, vendorConvention, bowerMapping: config._normalized.bowerFilesMap}

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
  debug "Concatenating #{files.map((_) -> _.path).join(', ')} to #{path}"
  files.forEach (file) ->
    root.add file.node
    root.add ';' if type is 'javascript'
    #debug JSON.stringify(file.node)
    root.setSourceContent file.node.source, file.source

  root.prepend definition() if type is 'javascript'
  root.toStringWithSourceMap file: path

optimize = (data, prevMap, path, optimizers, isEnabled, callback) ->
  initial = {data, code: data, path, map: prevMap}
  return callback null, initial unless isEnabled

  chained = optimizers.map (optimizer) ->
    (params, next) ->
      optimizer._optimize params, (error, optimized) ->
        return next error if error?
        code = optimized.data
        map = optimized.map
        if map?
          json = params.map.toJSON()
          smConsumer = new SourceMapConsumer json
          newMap = SourceMapGenerator.fromSourceMap new SourceMapConsumer map
          newMap._sources.add path
          newMap._mappings.forEach (mapping) ->
            mapping.source = path
          newMap._sourcesContents ?= {}
          newMap._sourcesContents["$#{path}"] = ''  # data
          newMap.applySourceMap smConsumer
        else
          newMap = params.map
        result = code
        next error, {data: code, code, map: newMap}
  chained.unshift (next) -> next null, initial
  waterfall chained, callback

generate = (path, sourceFiles, config, optimizers, callback) ->
  type = if sourceFiles.some((file) -> file.type in ['javascript', 'template'])
    'javascript'
  else
    'stylesheet'
  optimizers = optimizers.filter((optimizer) -> optimizer.type is type)

  sorted = sort sourceFiles, config

  {code, map} = concat sorted, path, type, config._normalized.modules.definition

  withMaps = (map and config.sourceMaps)
  mapPath = "#{path}.map"

  optimize code, map, path, optimizers, config.optimize, (error, data) ->
    return callback error if error?

    if withMaps
      base = sysPath.basename mapPath
      controlChar = if config.sourceMaps is 'new' then '#' else '@'
      data.code += if type is 'javascript'
        "\n//#{controlChar} sourceMappingURL=#{base}"
      else
        "\n/*#{controlChar} sourceMappingURL=#{base}*/"

    common.writeFile path, data.code, ->
      if withMaps
        common.writeFile mapPath, data.map.toString(), callback
      else
        callback()

generate.sortByConfig = sortByConfig
module.exports = generate
