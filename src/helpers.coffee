'use strict'

{exec} = require 'child_process'
http = require 'http'
fs = require 'fs'
os = require 'os'
sysPath = require 'path'
logger = require 'loggy'
{SourceNode} = require 'source-map'
readComponents = require 'read-components'
debug = require('debug')('brunch:helpers')
commonRequireDefinition = require 'commonjs-require-definition'
# Just require.
require 'coffee-script'

# Extends the object with properties from another object.
# Example
#
#   extend {a: 5, b: 10}, {b: 15, c: 20, e: 50}
#   # => {a: 5, b: 15, c: 20, e: 50}
#
exports.extend = extend = (object, properties) ->
  Object.keys(properties).forEach (key) ->
    object[key] = properties[key]
  object

applyOverrides = (config, options) ->
  options.applyOverrides.forEach (override) ->
    recursiveExtend config, config.overrides?[override] or {}
  delete options.applyOverrides
  config

recursiveExtend = (object, properties) ->
  Object.keys(properties).forEach (key) ->
    value = properties[key]
    if typeof value is 'object' and value?
      recursiveExtend object[key], value
    else
      object ?= {}
      object[key] = value
  object

exports.deepFreeze = deepFreeze = (object) ->
  Object.keys(Object.freeze object)
    .map (key) ->
      object[key]
    .filter (value) ->
      typeof value is 'object' and value? and not Object.isFrozen(value)
    .forEach(deepFreeze)
  object

exports.formatError = (error, path) ->
  "#{error.brunchType} of '#{path}'
 failed. #{error.toString().slice(7)}"

exports.install = install = (rootPath, command, callback = (->)) ->
  prevDir = process.cwd()
  logger.info "Installing #{command} packages..."
  process.chdir rootPath
  # Install packages.
  exec "#{command} install", (error, stdout, stderr) ->
    process.chdir prevDir
    if error?
      log = stderr.toString()
      logger.error log
      return callback log
    callback null, stdout

exports.isWindows = isWindows = do -> os.platform() is 'win32'

exports.replaceSlashes = replaceSlashes = (_) ->
  if isWindows then _.replace(/\//g, '\\') else _

exports.replaceBackSlashes = replaceBackSlashes = (_) ->
  if isWindows then _.replace(/\\/g, '\/') else _

exports.replaceConfigSlashes = replaceConfigSlashes = (config) ->
  files = config.files or {}
  Object.keys(files).forEach (language) ->
    lang = files[language] or {}
    order = lang.order or {}

    # Modify order.
    Object.keys(order).forEach (orderKey) ->
      lang.order[orderKey] = lang.order[orderKey].map(replaceSlashes)

    # Modify join configuration.
    switch toString.call(lang.joinTo)
      when '[object String]'
        lang.joinTo = replaceSlashes lang.joinTo
      when '[object Object]'
        newJoinTo = {}
        Object.keys(lang.joinTo).forEach (joinToKey) ->
          newJoinTo[replaceSlashes joinToKey] = lang.joinTo[joinToKey]
        lang.joinTo = newJoinTo
  config

# Config items can be a RegExp or a function.
# The function makes universal API to them.
#
# item - RegExp or Function
#
# Returns Function.
normalizeChecker = (item) ->
  switch toString.call(item)
    when '[object RegExp]'
      (string) -> item.test string
    when '[object Function]'
      item
    else
      throw new Error("Config item #{item} is invalid.
Use RegExp or Function.")

# Converts `config.files[...].joinTo` to one format.
# config.files[type].joinTo can be a string, a map of {str: regexp} or a map
# of {str: function}.
#
# Example output:
#
# {
#   javascripts: {'javascripts/app.js': checker},
#   templates: {'javascripts/app.js': checker2}
# }
#
# Returns Object of Object-s.
createJoinConfig = (configFiles) ->
  # Can be used in `reduce` as `array.reduce(listToObj, {})`.
  listToObj = (acc, elem) ->
    acc[elem[0]] = elem[1]
    acc

  types = Object.keys(configFiles)
  joinConfig = types
    .map (type) ->
      configFiles[type].joinTo
    .map (joinTo) ->
      if typeof joinTo is 'string'
        object = {}
        object[joinTo] = /.+/
        object
      else
        joinTo
    .map (joinTo, index) ->
      makeChecker = (generatedFilePath) ->
        [generatedFilePath, normalizeChecker(joinTo[generatedFilePath])]
      subConfig = Object.keys(joinTo).map(makeChecker).reduce(listToObj, {})
      [types[index], subConfig]
    .reduce(listToObj, {})

  # special matching for plugin helpers
  types.forEach (type) ->
    joinConfig[type].pluginHelpers = configFiles[type].pluginHelpers or
      do ->
        destFiles = Object.keys joinConfig[type]
        joinMatch = destFiles.filter (file) -> joinConfig[type][file] 'vendor/.'
        return joinMatch[0] if joinMatch.length > 0
        nameMatch = destFiles.filter (file) -> /vendor/i.test file
        return nameMatch[0] if nameMatch.length > 0
        destFiles.shift()

  Object.freeze(joinConfig)

identityNode =
exports.identityNode = (code, source) ->
  new SourceNode 1, 0, null, code.split('\n').map (line, index) ->
    new SourceNode index + 1, 0, source, (line + '\n')

exports.cleanModuleName = cleanModuleName = (path, nameCleaner) ->
  nameCleaner path.replace(new RegExp('\\\\', 'g'), '/')

getModuleWrapper = (type, nameCleaner) -> (fullPath, data, isVendor) ->
  sourceURLPath = cleanModuleName fullPath, nameCleaner
  moduleName = sourceURLPath.replace /\.\w+$/, ''
  path = JSON.stringify moduleName

  if isVendor
    debug 'Wrapping is vendor'
    data
  else
    # Wrap in common.js require definition.
    if type is 'commonjs'
      prefix: "require.register(#{path}, function(exports, require, module) {\n"
      suffix: "});\n\n"
    else if type is 'amd'
      data: data.replace /define\s*\(/, (match) -> "#{match}#{path}, "

normalizeWrapper = (typeOrFunction, nameCleaner) ->
  switch typeOrFunction
    when 'commonjs' then getModuleWrapper 'commonjs', nameCleaner
    when 'amd' then getModuleWrapper 'amd', nameCleaner
    when false then (path, data) -> data
    else
      if typeof typeOrFunction is 'function'
        typeOrFunction
      else
        throw new Error 'config.modules.wrapper should be a function or one of:
"commonjs", "amd", false'

normalizeDefinition = (typeOrFunction) ->
  switch typeOrFunction
    when 'commonjs'
      -> commonRequireDefinition
    when 'amd', false then -> ''
    else
      if typeof typeOrFunction is 'function'
        typeOrFunction
      else
        throw new Error 'config.modules.definition should be a function
or one of: "commonjs", false'

exports.setConfigDefaults = setConfigDefaults = (config, configPath) ->
  join = (parent, name) =>
    sysPath.join config.paths[parent], name

  joinRoot = (name) ->
    join 'root', name

  paths                = config.paths         ?= {}
  paths.root          ?= '.'
  paths.public        ?= joinRoot 'public'
  paths.watched       ?= ['app', 'test', 'vendor'].map(joinRoot)

  paths.config        ?= configPath           ?  joinRoot 'config'
  paths.packageConfig ?= joinRoot 'package.json'
  paths.bowerConfig   ?= joinRoot 'bower.json'

  conventions          = config.conventions   ?= {}
  conventions.assets  ?= /assets[\\/]/
  conventions.ignored ?= paths.ignored ? (path) ->
    sysPath.basename(path)[0] is '_'
  conventions.vendor  ?= /(^bower_components|vendor)[\\/]/

  config.notifications ?= true
  config.sourceMaps   ?= true
  config.optimize     ?= false

  modules              = config.modules       ?= {}
  modules.wrapper     ?= 'commonjs'
  modules.definition  ?= 'commonjs'
  modules.nameCleaner ?= (path) -> path.replace(/^app\//, '')

  server               = config.server        ?= {}
  server.base         ?= ''
  server.port         ?= 3333
  server.run          ?= false

  overrides            = config.overrides     ?= {}
  overrides.optimize  ?= optimize: true
  production           = overrides.production ?= {}
  production.optimize ?= true
  production.sourceMaps ?= false
  production.plugins  ?= autoReload: {}
  production.plugins.autoReload.enabled ?= false

  config

getConfigDeprecations = (config) ->
  messages = []
  warnRemoved = (path) ->
    if config.paths[path]
      messages.push "config.paths.#{path} was removed, use config.paths.watched"

  warnMoved = (configItem, from, to) ->
    messages.push "config.#{from} moved to config.#{to}" if configItem

  warnRemoved 'app'
  warnRemoved 'test'
  warnRemoved 'vendor'
  warnRemoved 'assets'

  warnMoved config.paths.ignored, 'paths.ignored', 'conventions.ignored'
  warnMoved config.rootPath, 'rootPath', 'paths.root'
  warnMoved config.buildPath, 'buildPath', 'paths.public'

  ensureNotArray = (name) ->
    if Array.isArray config.paths[name]
      messages.push "config.paths.#{name} can't be an array.
Use config.conventions.#{name}"

  ensureNotArray 'assets'
  ensureNotArray 'test'
  ensureNotArray 'vendor'
  messages

normalizeConfig = (config) ->
  normalized = {}
  normalized.join = createJoinConfig config.files
  mod = config.modules
  normalized.modules = {}
  normalized.modules.wrapper = normalizeWrapper mod.wrapper, config.modules.nameCleaner
  normalized.modules.definition = normalizeDefinition mod.definition
  normalized.conventions = {}
  Object.keys(config.conventions).forEach (name) ->
    normalized.conventions[name] = normalizeChecker config.conventions[name]
  normalized.paths = {}
  normalized.paths.possibleConfigFiles = Object.keys(require.extensions)
    .map (_) ->
      config.paths.config + _
    .reduce (obj, _) ->
      obj[_] = true
      obj
    , {}
  normalized.paths.allConfigFiles = [
    config.paths.packageConfig
    config.paths.bowerConfig
  ].concat Object.keys normalized.paths.possibleConfigFiles
  config._normalized = normalized
  config

exports.loadConfig = (configPath = 'config', options = {}, callback) ->
  fullPath = require.resolve sysPath.resolve configPath
  delete require.cache[fullPath]
  try
    config = require(fullPath).config
  catch error
    throw new Error "couldn\'t load config #{fullPath}. #{error}"
  setConfigDefaults config, configPath

  deprecations = getConfigDeprecations config
  deprecations.forEach logger.warn if deprecations.length > 0

  applyOverrides config, options
  recursiveExtend config, options
  replaceConfigSlashes config if isWindows
  normalizeConfig config
  readComponents '.', 'bower', (error, bowerComponents) ->
    if error and not /ENOENT/.test(error.toString())
      logger.error error
    bowerComponents ?= []
    config._normalized.bowerComponents = bowerComponents
    filesMap = config._normalized.bowerFilesMap = {}
    bowerComponents.forEach (component) ->
      filesLength = component.files.length
      component.files.forEach (file, index) ->
        filesMap[file] = component.sortingLevel + (filesLength * 0.001 - index * 0.001)

    deepFreeze config
    callback null, config
