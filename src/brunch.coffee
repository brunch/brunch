async = require 'async'
{spawn} = require 'child_process'
fs = require 'fs'
mkdirp = require 'mkdirp'
{ncp} = require 'ncp'
sysPath = require 'path'
fs_utils = require './fs_utils'
helpers = require './helpers'

loadPlugins = (config, callback) ->
  fs.readFile 'package.json', (error, data) ->
    deps = (JSON.parse data).dependencies
    callback null, Object.keys(deps).map (dependency) ->
      plugin = require sysPath.join '.', 'node_modules', dependency
      new plugin config

isCompilerFor = (path) -> (plugin) ->
  pattern = if plugin.pattern
    plugin.pattern
  else if plugin.extension
    ///\.#{plugin.extension}$///
  else
    null
  (typeof plugin.compile is 'function') and !!(pattern?.test path)

compileFile = (path, compiler, destinationPath, callback) ->
  compiler.compile path, (error, data) ->
    if error?
      return callback "[#{languageName}]: cannot compile '#{path}': #{error}"
    callback null, {destinationPath, path, data}

passFileToCompilers = (path, plugins, callback) ->
  plugins
    .filter(isCompilerFor path)
    .forEach (language) ->
      {compiler, destinationPath} = language
      compileFile path, compiler, destinationPath, callback

# Recompiles all files in current working directory.
# 
# rootPath - path to application directory.
# config - Parsed app config.
# persistent - Should watcher be stopped after compiling the app first time?
# callback - Callback that would be executed on each compilation.
# 
# Returns `fs_utils.FSWatcher` object.
watchApplication = (persistent, rootPath, config, callback) ->
  config.buildPath ?= sysPath.join rootPath, 'public'
  config.server ?= {}
  config.server.port ?= 3333

  # Pass rootPath to config in order to allow plugins to use it.
  config.rootPath = rootPath

  #mkdirp buildPath, (parseInt 755, 8), (error) ->
  #  return helpers.logError "[Brunch]: Error #{error}" if error?
  helpers.startServer config.server.port, config.buildPath if config.server.run
  directories = ['app', 'vendor'].map (dir) -> sysPath.join rootPath, dir
  writer = new fs_utils.FileWriter config.buildPath, config.files, plugins
  watcher = (new fs_utils.FSWatcher directories)
    .on 'change', (path) ->
      passFileToCompilers path, plugins, (error, result) ->
        return helpers.logError error if error?
        writer.emit 'change', result
    .on 'remove', (path) ->
      writer.emit 'remove', path
  writer.on 'error', (error) ->
    helpers.logError "[Brunch] write error. #{error}"
  writer.on 'write', (result) ->
    helpers.log "[Brunch]: compiled."
    watcher.close() unless persistent
    callback result
  watcher

generateFile = (path, data, callback) ->
  parentDir = sysPath.dirname path
  write = ->
    helpers.log "create #{path}"
    fs.writeFile path, data, callback
  sysPath.exists parentDir, (exists) ->
    return write() if exists
    helpers.log "invoke #{parentDir}"
    mkdirp parentDir, (parseInt 755, 8), (error) ->
      return helpers.logError if error?
      write()

destroyFile = (path, callback) ->
  helpers.log "destroy #{path}"
  fs.unlink path, callback

generateOrDestroy = (generate, options, callback) ->
  {rootPath, type, name, config, parentDir} = options
  generateOrDestroyFile = if generate then generateFile else destroyFile
  console.log 'g', config

  languageType = switch type
    when 'collection', 'model', 'router', 'view' then 'javascripts'
    when 'style' then 'stylesheets'
    else type

  extension = config.files[languageType].defaultExtension ? switch languageType
    when 'javascripts' then 'coffee'
    when 'stylesheets' then 'styl'
    when 'templates' then 'eco'

  initFile = (parentDir, callback) ->
    name += "_#{type}" if type in ['router', 'view']
    parentDir ?= if languageType is 'template'
      sysPath.join rootPath, 'app', 'views', "#{type}s"
    else
      sysPath.join rootPath, 'app', "#{type}s"
    fullPath = sysPath.join parentDir, "#{name}.#{extension}"
    data = ''
    if generate
      generateFile fullPath, data, callback
    else
      destroyFile fullPath, callback

  # We'll additionally generate tests for 'script' languages.
  initTests = (parentDir, callback) ->
    return callback() unless languageType is 'script'
    parentDir ?= sysPath.join rootPath, 'test', 'unit', "#{type}s"
    fullPath = sysPath.join parentDir, "#{name}_test.#{extension}"
    if generate
      generateFile fullPath, data, callback
    else
      destroyFile fullPath, callback
 
  initFile parentDir, ->
    initTests parentDir, ->
      callback()

# Create new application in `rootPath` and build it.
# App is created by copying directory `../template/base` to `rootPath`.
exports.new = (options, callback = (->)) ->
  {rootPath, buildPath, template} = options
  buildPath ?= sysPath.join rootPath, 'build'
  template ?= sysPath.join __dirname, '..', 'template', 'base'
  sysPath.exists rootPath, (exists) ->
    if exists
      return helpers.logError "Directory '#{rootPath}' already exists"
    mkdirp rootPath, (parseInt 755, 8), (error) ->
      return helpers.logError error if error?
      ncp template, rootPath, (error) ->
        return helpers.logError error if error?
        helpers.log 'Created brunch directory layout'
        callback()

# Build application once and execute callback.
exports.build = (rootPath, config, callback = (->)) ->
  watchApplication no, rootPath, config, callback

# Watch application for changes and execute callback on every compilation.
exports.watch = (rootPath, config, callback = (->)) ->
  watchApplication yes, rootPath, config, callback

# Generate new controller / model / view and its tests.
# 
# rootPath - path to application directory.
# type - one of: collection, model, router, style, template, view.
# name - filename.
# config - parsed app config.
# 
exports.generate = (options, callback = (->)) ->
  generateOrDestroy yes, options, callback

exports.destroy = (options, callback = (->)) ->
  generateOrDestroy no, options, callback
