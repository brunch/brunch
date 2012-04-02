coffeescript = require 'coffee-script'
express = require 'express'
fs = require 'fs'
sysPath = require 'path'
logger = require './logger'

require.extensions['.coffee'] ?= (module, filename) ->
  content = coffeescript.compile fs.readFileSync filename, 'utf8', {filename}
  module._compile content, filename

# A simple function that will return pluralized form of word.
exports.pluralize = (word) ->
  word + 's'

exports.startsWith = (string, substring) ->
  string.indexOf(substring) is 0

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

startDefaultServer = (port, path, callback) ->
  server = express.createServer()
  server.configure ->
    server.use express.static path
    server.set 'views', path
    server.set 'view options', layout: no
    server.register '.html', compile: (str, options) -> (locals) -> str
  server.get '/', (req, res) ->
    res.render 'index.html'
  server.listen parseInt port, 10
  server.on 'listening', callback
  logger.info "application started on http://localhost:#{port}/"

exports.startServer = (config, callback = (->)) ->
  if config.server.path
    try
      server = require sysPath.resolve config.pathes.server
      server.startServer config.server.port, config.pathes.build, callback
    catch error
      logger.error "couldn\'t load server #{config.server.path}: #{error}"
  else
    startDefaultServer config.server.port, config.pathes.build, callback

setConfigDefaults = (config) ->
  join = (parent, name) =>
    sysPath.join config.pathes[parent], name
  config.pathes ?= {}
  config.pathes.root ?= config.rootPath ? '.'
  config.pathes.build ?= config.buildPath ? join 'root', 'public'
  config.pathes.app ?= join 'root', 'app'
  config.pathes.assets ?= join 'app', 'assets'
  config.pathes.test ?= join 'root', 'test'
  config.pathes.vendor ?= join 'root', 'vendor'
  config.server ?= {}
  config.server.path ?= null
  config.server.port ?= 3333
  config.server.run ?= no
  # Alias deprecated config params.
  config.rootPath = config.pathes.root
  config.buildPath = config.pathes.build

  if process.platform is 'win32'
    changePath = (string) -> string.split('/').join('\\')
    files = config.files or {}
    Object.keys(files).forEach (language) ->
      lang = files[language] or {}
      order = lang.order or {}
      Object.keys(order).forEach (orderKey) ->
        lang[orderKey] = lang.orderKey.map changePath
      switch toString.call lang.joinTo
        when '[object String]'
          lang.joinTo = changePath lang.joinTo
        when '[object Object]'
          Object.keys(lang.joinTo).forEach (joinToKey) ->
            lang.joinTo[joinToKey]
  config

exports.loadConfig = (configPath = 'config') ->
  try
    {config} = require sysPath.resolve configPath
    setConfigDefaults config
  catch error
    logger.error "couldn\'t load config #{configPath}. #{error}"
    config = null
  config

exports.loadPlugins = (config, callback) ->
  rootPath = sysPath.resolve config.rootPath
  fs.readFile (sysPath.join rootPath, 'package.json'), (error, data) ->
    return callback error if error?
    deps = Object.keys (JSON.parse data).dependencies
    plugins = deps
      .map (dependency) ->
        require "#{rootPath}/node_modules/#{dependency}"
      .filter (plugin) ->
        (plugin::)? and plugin::brunchPlugin
      .map (plugin) ->
        new plugin config
    callback null, plugins
