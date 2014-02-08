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
anysort = require 'anysort'
coffee = require 'coffee-script'
coffee.register()

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
  # Allow the environment to be set from environment variable
  environments = options.env
  if process.env.BRUNCH_ENV?
    environments.unshift process.env.BRUNCH_ENV

  environments.forEach (override) ->
    deepExtend config, config.overrides?[override] or {}, config.files
  config

deepExtend = (object, properties, rootFiles = {}) ->
  nestedObjs = Object.keys(rootFiles).map (_) -> rootFiles[_]
  Object.keys(properties).forEach (key) ->
    value = properties[key]
    # Special case for files[type]: don't merge nested objects.
    if toString.call(value) is '[object Object]' and object not in nestedObjs
      object[key] ?= {}
      deepExtend object[key], value, rootFiles
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
  "#{error.code} of '#{path}'
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
  return config unless isWindows
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
normalizeChecker = anysort.matcher

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
  conventions.ignored ?= paths.ignored ? [
    /[\\/]_/
    /vendor[\\/](node|j?ruby-.*|bundle)[\\/]/
  ]
  conventions.vendor  ?= /(^bower_components|vendor)[\\/]/

  config.notifications ?= true
  config.sourceMaps   ?= true
  config.optimize     ?= false
  config.plugins      ?= {}

  modules              = config.modules       ?= {}
  modules.wrapper     ?= 'commonjs'
  modules.definition  ?= 'commonjs'
  modules.nameCleaner ?= (path) -> path.replace(/^app\//, '')

  server               = config.server        ?= {}
  server.base         ?= ''
  server.port         ?= 3333
  server.run          ?= false

  overrides            = config.overrides     ?= {}
  production           = overrides.production ?= {}
  production.optimize ?= true
  production.sourceMaps ?= false
  production.plugins  ?= {}
  production.plugins.autoReload ?= {}
  production.plugins.autoReload.enabled ?= false

  config

warnAboutConfigDeprecations = (config) ->
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

  messages.forEach logger.warn

  config

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
  ['on', 'off', 'only'].forEach (key) ->
    if typeof config.plugins[key] is 'string'
      config.plugins[key] = [config.plugins[key]]
  config

loadComponents = (config, type, callback) ->
  readComponents '.', type, (error, components, aliases) ->
    if error and not /ENOENT/.test(error.toString())
      logger.error error
    components ?= []

    order = components
      .sort (a, b) ->
        if a.sortingLevel is b.sortingLevel
          if a.files[0] < b.files[0] then -1 else 1
        else
          b.sortingLevel - a.sortingLevel
      .reduce (flat, component) ->
        flat.concat component.files
      , []

    callback {components, aliases, order}

exports.loadConfig = (configPath = 'brunch-config', options = {}, callback) ->
  try
    # assign fullPath in two steps in case require.resolve throws
    fullPath = sysPath.resolve configPath
    fullPath = require.resolve fullPath
    delete require.cache[fullPath]
    config = require(fullPath).config
  catch error
    if configPath is 'brunch-config' and error.code is 'MODULE_NOT_FOUND'
      # start to warn about deprecation of 'config' with 1.8 release
      # seamless and silent fallback until then
      return exports.loadConfig 'config', options, callback
      # 'config' should remain available as a working deprecated option until 2.0
    else
      throw new Error "couldn\'t load config #{fullPath}. #{error}"

  setConfigDefaults config, configPath
  warnAboutConfigDeprecations config
  applyOverrides config, options
  deepExtend config, options
  replaceConfigSlashes config
  normalizeConfig config
  config._normalized.packageInfo = {}

  loadComponents config, 'bower', (bowerRes)->
    config._normalized.packageInfo.bower = bowerRes

    loadComponents config, 'component', (componentRes) ->
      config._normalized.packageInfo.component = componentRes
      deepFreeze config
      callback null, config
