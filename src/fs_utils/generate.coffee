'use strict'

debug = require('debug')('brunch:generate')
fs = require 'fs'
sysPath = require 'path'
waterfall = require 'async-waterfall'
anysort = require 'anysort'
common = require './common'
{SourceMapConsumer, SourceMapGenerator, SourceNode} = require 'source-map'

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
    criteria = [
      config.before ? []
      config.after ? []
      config.joinToValue ? []
      config.bower ? []
      config.component ? []
      config.vendorConvention ? -> no
    ]
    anysort.grouped files, criteria, [0, 2, 3, 4, 5, 6, 1]
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
  {conventions, packageInfo} = config._normalized
  vendorConvention = conventions.vendor
  bower = packageInfo.bower.order
  component = packageInfo.component.order
  {before, after, vendorConvention, bower, component}

sort = (files, config, joinToValue) ->
  paths = files.map (file) -> file.path
  indexes = Object.create(null)
  files.forEach (file, index) -> indexes[file.path] = file
  order = extractOrder files, config
  order.joinToValue = joinToValue if Array.isArray joinToValue
  sortByConfig(paths, order).map (path) ->
    indexes[path]

# New.
concat = (files, path, type, definition, aliases) ->
  # nodes = files.map toNode
  root = new SourceNode()
  debug "Concatenating #{files.map((_) -> _.path).join(', ')} to #{path}"
  files.forEach (file) ->
    root.add file.node
    data = if file.node.isIdentity then file.data else file.source
    root.add ';' if type is 'javascript' and ';' isnt data.trim().substr -1
    root.setSourceContent file.node.source, data

  root.prepend definition(path, root.sourceContents) if type is 'javascript'
  aliases?.forEach (alias) ->
    key = Object.keys(alias)[0]
    root.add "require.alias('#{key}', '#{alias[key]}');"

  root.toStringWithSourceMap file: path

mapOptimizerChain = (optimizer) -> (params, next) ->
  {data, code, map, path, sourceFiles} = params
  debug "Optimizing '#{path}' with '#{optimizer.constructor.name}'"

  optimizerArgs = if optimizer.optimize.length is 2
    # New API: optimize({data, path, map}, callback)
    [params]
  else
    # Old API: optimize(data, path, callback)
    [data, path]

  optimizerArgs.push (error, optimized) ->
    return next error if error?
    if toString.call(optimized) is '[object Object]'
      optimizedCode = optimized.data
      optimizedMap = optimized.map
    else
      optimizedCode = optimized
    if optimizedMap?
      newMap = SourceMapGenerator.fromSourceMap new SourceMapConsumer optimizedMap
      newMap._sourcesContents ?= {}
      sourceFiles.forEach ({path, source}) ->
        newMap._sourcesContents["$#{path}"] = source
    else
      newMap = map
    next error, {data: optimizedCode, code: optimizedCode, map: newMap, path, sourceFiles}

  optimizer.optimize.apply optimizer, optimizerArgs

optimize = (data, map, path, optimizers, sourceFiles, callback) ->
  initial = {data, code: data, map, path, sourceFiles}
  first = (next) -> next null, initial
  waterfall [first].concat(optimizers.map mapOptimizerChain), callback

generate = (path, sourceFiles, config, optimizers, callback) ->
  type = if sourceFiles.some((file) -> file.type in ['javascript', 'template'])
    'javascript'
  else
    'stylesheet'
  optimizers = optimizers.filter((optimizer) -> optimizer.type is type)

  joinToValue = config.files["#{type}s"].joinTo[path[config.paths.public.length+1..]]
  sorted = sort sourceFiles, config, joinToValue

  {code, map} = concat sorted, path, type, config._normalized.modules.definition, config._normalized.packageInfo['component'].aliases

  withMaps = (map and config.sourceMaps)
  mapPath = "#{path}.map"

  optimize code, map, path, optimizers, sourceFiles, (error, data) ->
    return callback error if error?

    if withMaps
      mapRoute = if config.sourceMaps is 'absoluteUrl'
        mapPath
          .replace config.paths.public, ''
          .replace '\\', '/'
      else
        sysPath.basename mapPath
      controlChar = if config.sourceMaps is 'old' then '@' else '#'
      data.code += if type is 'javascript'
        "\n//#{controlChar} sourceMappingURL=#{mapRoute}"
      else
        "\n/*#{controlChar} sourceMappingURL=#{mapRoute}*/"

    common.writeFile path, data.code, ->
      if withMaps
        common.writeFile mapPath, data.map.toString(), callback
      else
        callback()

generate.sortByConfig = sortByConfig

module.exports = generate
