'use strict'

{exec} = require 'child_process'
coffeescript = require 'coffee-script'
express = require 'express'
Handlebars = require 'handlebars'
fs = require 'fs'
os = require 'os'
sysPath = require 'path'
logger = require './logger'

exports.startsWith = startsWith = (string, substring) ->
  string.lastIndexOf(substring, 0) is 0

exports.flatten = flatten = (array) ->
  array.reduce (acc, elem) ->
    acc.concat(if Array.isArray(elem) then flatten(elem) else [elem])
  , []

exports.callFunctionOrPass = callFunctionOrPass = (thing) ->
  if typeof thing is 'function' then thing() else thing

exports.ensureArray = ensureArray = (object) ->
  if Array.isArray object
    object
  else
    [object]

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
  Object.keys(Object.freeze(object))
    .map (key) ->
      object[key]
    .filter (value) ->
      typeof value is 'object' and value? and not Object.isFrozen(value)
    .forEach(deepFreeze)
  object

exports.formatError = (error, path) ->
  "#{error.brunchType} of '#{path}'
 failed. #{error.toString().slice(7)}"

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
exports.sortByConfig = (files, config) ->
  if toString.call(config) is '[object Object]'
    cfg =
      before: config.before ? []
      after: config.after ? []
      vendorConvention: (config.vendorConvention ? -> no)
    files.slice().sort (a, b) -> sortByBefore cfg, a, b
  else
    files

exports.pwd = pwd = ->
  '.'

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

startDefaultServer = (port, path, base, callback) ->
  server = express()
  server.use (request, response, next) ->
    response.header 'Cache-Control', 'no-cache'
    next()
  server.use base, express.static path
  server.all "#{base}/*", (request, response) ->
    response.sendfile sysPath.join path, 'index.html'
  server.listen port, callback
  server

exports.startServer = (config, callback = (->)) ->
  port = parseInt config.server.port, 10
  publicPath = config.paths.public
  onListening = ->
    logger.info "application started on http://localhost:#{port}/"
    callback()
  if config.server.path
    try
      server = require sysPath.resolve config.server.path
      server.startServer port, publicPath, onListening
    catch error
      logger.error "couldn\'t load server #{config.server.path}: #{error}"
  else
    startDefaultServer port, publicPath, config.server.base, onListening

exports.replaceSlashes = replaceSlashes = (config) ->
  changePath = (string) -> string.replace(/\//g, '\\')
  files = config.files or {}
  Object.keys(files).forEach (language) ->
    lang = files[language] or {}
    order = lang.order or {}

    # Modify order.
    Object.keys(order).forEach (orderKey) ->
      lang.order[orderKey] = lang.order[orderKey].map(changePath)

    # Modify join configuration.
    switch toString.call(lang.joinTo)
      when '[object String]'
        lang.joinTo = changePath lang.joinTo
      when '[object Object]'
        newJoinTo = {}
        Object.keys(lang.joinTo).forEach (joinToKey) ->
          newJoinTo[changePath joinToKey] = lang.joinTo[joinToKey]
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

# Can be used in `reduce` as `array.reduce(listToObj, {})`.
listToObj = (acc, elem) ->
  acc[elem[0]] = elem[1]
  acc

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

normalizeWrapper = (typeOrFunction) ->
  switch typeOrFunction
    when 'commonjs'
      (path, data) ->
        """
  window.require.define({#{path}: function(exports, require, module) {
    #{data.replace(/\n(?!\n)/g, '\n  ')}
  }});\n\n
  """
    when 'amd'
      (path, data) ->
        """
  define(#{path}, ['require', 'exports', 'module'], function(require, exports, module) {
    #{data.replace(/\n(?!\n)/g, '\n  ')}
  });
  """
    when false then (path, data) -> "#{data}"
    else
      if typeof typeOrFunction is 'function'
        typeOrFunction
      else
        throw new Error 'config.modules.wrapper should be a function or one of:
"commonjs", "amd", false'

normalizeDefinition = (typeOrFunction) ->
  switch typeOrFunction
    when 'commonjs'
      path = sysPath.join __dirname, '..', 'vendor', 'require_definition.js'
      data = fs.readFileSync(path).toString()
      -> data
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
  paths.root          ?= config.rootPath  ? pwd()
  paths.public        ?= config.buildPath ? joinRoot 'public'

  paths.app           ?= joinRoot 'app'
  paths.generators    ?= joinRoot 'generators'
  paths.test          ?= joinRoot 'test'
  paths.vendor        ?= joinRoot 'vendor'

  paths.assets        ?= join('app', 'assets')

  paths.config         = configPath       ? joinRoot 'config'
  paths.packageConfig ?= joinRoot 'package.json'

  conventions          = config.conventions  ?= {}
  conventions.assets  ?= /assets(\/|\\)/
  conventions.ignored ?= paths.ignored ? (path) ->
    startsWith sysPath.basename(path), '_'
  conventions.tests   ?= /_test\.\w+$/
  conventions.vendor  ?= /vendor(\/|\\)/

  config.notifications ?= on
  modules              = config.modules      ?= {}
  modules.wrapper     ?= 'commonjs'
  modules.definition  ?= 'commonjs'

  config.server       ?= {}
  config.server.base  ?= ''
  config.server.port  ?= 3333
  config.server.run   ?= no
  config

getConfigDeprecations = (config) ->
  messages = []
  warnMoved = (configItem, from, to) ->
    messages.push "config.#{from} moved to config.#{to}" if configItem

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
  normalized.modules = {}
  normalized.modules.wrapper = normalizeWrapper config.modules.wrapper
  normalized.modules.definition = normalizeDefinition config.modules.definition
  normalized.conventions = {}
  Object.keys(config.conventions).forEach (name) ->
    normalized.conventions[name] = normalizeChecker config.conventions[name]
  config._normalized = Object.freeze normalized
  config

exports.loadConfig = (configPath = 'config', options = {}) ->
  fullPath = sysPath.resolve configPath
  delete require.cache[fullPath]
  try
    {config} = require fullPath
  catch error
    throw new Error("couldn\'t load config #{configPath}. #{error}")
  setConfigDefaults config, fullPath
  deprecations = getConfigDeprecations config
  deprecations.forEach logger.warn if deprecations.length > 0
  recursiveExtend config, options
  replaceSlashes config if os.platform() is 'win32'
  normalizeConfig config
  deepFreeze config
  config

exports.loadPackages = (rootPath, callback) ->
  rootPath = sysPath.resolve rootPath
  nodeModules = "#{rootPath}/node_modules"
  fs.readFile sysPath.join(rootPath, 'package.json'), (error, data) ->
    return callback error if error?
    json = JSON.parse(data)
    deps = Object.keys(extend(json.devDependencies ? {}, json.dependencies))
    try
      plugins = deps.map (dependency) -> require "#{nodeModules}/#{dependency}"
    catch err
      error = err
    callback error, plugins

exports.getPlugins = (packages, config) ->
  packages
    .filter (plugin) ->
      (plugin::)? and plugin::brunchPlugin
    .map (plugin) ->
      new plugin config

getTestFiles = (config) ->
  isTestFile = (generatedFile) ->
    exports.startsWith(generatedFile, sysPath.normalize('test/')) and
    generatedFile.lastIndexOf('vendor') is -1

  joinPublic = (generatedFile) ->
    sysPath.join(config.paths.public, generatedFile)

  joinTo = config.files.javascripts.joinTo
  files = if typeof joinTo is 'string' then [joinTo] else Object.keys(joinTo)
  files.filter(isTestFile).map(joinPublic)

cachedTestFiles = null

exports.findTestFiles = (config) ->
  cachedTestFiles ?= getTestFiles config

Handlebars.registerHelper 'camelize', do ->
  camelize = (string) ->
    regexp = /[-_]([a-z])/g
    rest = string.replace regexp, (match, char) ->
      char.toUpperCase()
    rest[0].toUpperCase() + rest[1...]
  (options) ->
    new Handlebars.SafeString camelize options.fn this

exports.formatTemplate = (template, templateData) ->
  key = '__BRUNCH_TEMPLATE_FORMATTER'
  compiled = Handlebars.compile template.replace /\\\{/, key
  compiled(templateData).toString().replace(key, '\\')
