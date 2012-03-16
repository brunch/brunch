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
  object[key] = val for own key, val of properties
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
  logger.info "application started on http://0.0.0.0:#{port}."

exports.startServer = (port, buildPath, config, callback = (->)) ->
  if config.server?.path
    try
      server = require sysPath.resolve config.server.path
      server.startServer port, buildPath, callback
    catch error
      logger.error "couldn\'t load server #{config.server.path}: #{error}"
  else
    startDefaultServer port, buildPath, callback

exports.loadConfig = (configPath = 'config') ->
  try
    {config} = require sysPath.resolve configPath
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
