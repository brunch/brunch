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

recursiveExtend = (object, properties) ->
  Object.keys(properties).forEach (key) ->
    value = properties[key]
    if typeof value is 'object' and value?
      recursiveExtend object[key], value
    else
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

exports.install = install = (rootPath, callback = (->)) ->
  prevDir = process.cwd()
  logger.info 'Installing packages...'
  process.chdir rootPath
  # Install node packages.
  exec 'npm install', (error, stdout, stderr) ->
    process.chdir prevDir
    if error?
      log = stderr.toString()
      logger.error log
      return callback log
    callback null, stdout

exports.replaceSlashes = replaceSlashes = do ->
  if os.platform() is 'win32'
    (_) -> _.replace(/\//g, '\\')
  else
    (_) -> _


exports.replaceBackSlashes = replaceBackSlashes = do ->
  if os.platform() is 'win32'
    (_) -> _.replace(/\\/g, '\/')
  else
    (_) -> _

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
  result = types
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
  Object.freeze(result)

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

  paths                = config.paths     ?= {}
  paths.root          ?= '.'
  paths.public        ?= joinRoot 'public'
  paths.watched       ?= ['app', 'test', 'vendor'].map(joinRoot)

  paths.config        ?= configPath       ? joinRoot 'config'
  paths.packageConfig ?= joinRoot 'package.json'

  conventions          = config.conventions  ?= {}
  conventions.assets  ?= /assets[\\/]/
  conventions.ignored ?= paths.ignored ? (path) ->
    sysPath.basename(path)[0] is '_'
  conventions.vendor  ?= /(^bower_components|vendor)[\\/]/

  config.notifications ?= true
  config.sourceMaps   ?= true
  config.optimize     ?= false

  modules              = config.modules      ?= {}
  modules.wrapper     ?= 'commonjs'
  modules.definition  ?= 'commonjs'
  modules.nameCleaner ?= (path) -> path.replace(/^app\//, '')

  config.server       ?= {}
  config.server.base  ?= ''
  config.server.port  ?= 3333
  config.server.run   ?= false
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

  recursiveExtend config, options
  replaceConfigSlashes config if os.platform() is 'win32'
  normalizeConfig config
  readComponents '.', 'bower', (error, bowerComponents) ->
    if error and not /ENOENT/.test(error.toString())
      logger.error error
    bowerComponents ?= []
    config._normalized.bowerComponents = bowerComponents
    filesMap = config._normalized.bowerFilesMap = {}
    bowerComponents.forEach (component) ->
      component.files.forEach (file) ->
        filesMap[file] = component.sortingLevel

    deepFreeze config
    callback null, config
