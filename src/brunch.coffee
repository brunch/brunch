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
watchApplication = (rootPath, config, persistent, callback) ->
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

# Create new application in `rootPath` and build it.
# App is created by copying directory `../template/base` to `rootPath`.
exports.new = (rootPath, buildPath, callback = (->)) ->
  callback = buildPath if typeof buildPath is 'function'
  buildPath ?= sysPath.join rootPath, 'build'

  templatePath = sysPath.join __dirname, '..', 'template', 'base'
  sysPath.exists rootPath, (exists) ->
    if exists
      return helpers.logError "Can't create project: 
directory '#{rootPath}' already exists"
    mkdirp rootPath, (parseInt 755, 8), (error) ->
      return helpers.logError error if error?
      ncp templatePath, rootPath, (error) ->
        return helpers.logError error if error?
        helpers.log 'Created brunch directory layout'
        callback()

# Build application once and execute callback.
exports.build = (rootPath, config, callback = (->)) ->
  watchApplication rootPath, config, no, callback

# Watch application for changes and execute callback on every compilation.
exports.watch = (rootPath, config, callback = (->)) ->
  watchApplication rootPath, config, yes, callback

# Generate new controller / model / view and its tests.
# 
# rootPath - path to application directory.
# type - one of: collection, model, router, style, template, view.
# name - filename.
# config - parsed app config.
# 
# Examples
# 
#   generate './twitter', 'style', 'user', config
#   generate '.', 'view', 'user', config
#   generate '.', 'collection', 'users', config
# 
exports.generate = (rootPath, type, name, config, callback = (->)) ->
  unless config.extensions
    callback()
    return helpers.logError "Cannot find `extensions` option in config."

  # We'll additionally generate tests for 'script' languages.
  languageType = switch type
    when 'collection', 'model', 'router', 'view' then 'script'
    else type

  extension = config.extensions[languageType]

  generateFile = (callback) ->
    name += "_#{type}" if type in ['router', 'view']
    filename = "#{name}.#{extension}"

    path = if languageType is 'template'
      sysPath.join rootPath, 'app', 'views', "#{type}s", filename
    else
      sysPath.join rootPath, 'app', "#{type}s", filename

    fs.writeFile path, data, (error) ->
      return helpers.logError error if error?
      helpers.log "Generated #{path}"
      callback()

  generateTests = (callback) ->
    # TODO: remove the spike.
    return callback() unless languageType is 'script'
    testDirPath = sysPath.join rootPath, 'test', 'unit', "#{type}s"
    testFilePath = sysPath.join testDirPath, "#{name}_test.#{extension}"
    write = ->
      fs.writeFile testFilePath, '', (error) ->
        return helpers.logError error if error?
        helpers.log "Generated #{testFilePath}"
        callback()
    sysPath.exists testDirPath, (exists) ->
      return write() if exists
      mkdirp testDirPath, (parseInt 755, 8), (error) ->
        return helpers.logError error if error?
        write()

  generateFile ->
    generateTests ->
      callback()
