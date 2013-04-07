'use strict'

async = require 'async'
chokidar = require 'chokidar'
debug = require('debug')('brunch:watch')
sysPath = require 'path'
logger = require 'loggy'
fs_utils = require './fs_utils'
helpers = require './helpers'

# Get paths to files that plugins include. E.g. handlebars-brunch includes
# `../vendor/handlebars-runtime.js` with path relative to plugin.
#
# plugins - Array of brunch plugins.
#
# Returns Array of Strings.
getPluginIncludes = (plugins) ->
  plugins
    .map((plugin) -> helpers.callFunctionOrPass(plugin.include, plugin))
    .filter((paths) -> paths?)
    .reduce(((acc, elem) -> acc.concat(helpers.ensureArray elem)), [])

# Generate function that will check if object has property and it is a fn.
# Returns Function.
propIsFunction = (prop) -> (object) ->
  typeof object[prop] is 'function'

# Generate params that will be used as default config values.
#
# persistent - Boolean. Determines if brunch should run a web server.
# options    - Object. {optimize, publicPath, server, port}.
#
# Returns Object.
generateParams = (persistent, options) ->
  params = {}
  params.optimize = options.optimize if options.optimize?
  params.persistent = persistent
  if options.publicPath
    params.paths = {}
    params.paths.public = options.publicPath
  if persistent
    params.server = {}
    params.server.run = yes if options.server
    params.server.port = options.port if options.port
  params

# Filter paths that exist and watch them with `chokidar` package.
#
# config   - application config
# callback - Function that will take (error, `chokidar.FSWatcher` instance).
#
# Returns nothing.
initWatcher = (config, callback) ->
  watched = [
    config.paths.app, config.paths.test,
    config.paths.vendor, config.paths.assets,
    config.paths.config, config.paths.packageConfig
  ]

  watched.push config.paths.config + ext for ext of require.extensions

  async.filter watched, fs_utils.exists, (watchedFiles) ->
    watcher = chokidar.watch watchedFiles,
      ignored: fs_utils.ignored,
      persistent: config.persistent
    watcher
      .on 'add', (path) ->
        debug "File '#{path}' received event 'add'"
      .on 'change', (path) ->
        debug "File '#{path}' received event 'change'"
      .on 'unlink', (path) ->
        debug "File '#{path}' received event 'unlink'"
      .on('error', logger.error)
    callback null, watcher

# Generate function that will check if plugin can work with file.
#
# path   - Path to source file that can be compiled with plugin
# plugin - Brunch plugin instance.
#
# Returns Function.
isPluginFor = (path) -> (plugin) ->
  pattern = if plugin.pattern
    plugin.pattern
  else if plugin.extension
    RegExp "\\.#{plugin.extension}$"
  else
    /$.^/
  pattern.test(path)

# Determine which compiler should be used for path and
# emit `change` event.
#
# compilers - Array. Brunch plugins that were treated as compilers.
# linters   - Array. Brunch plugins that were treated as linters.
# fileList  - fs_utils.FileList instance.
# path      - String. Path to file that was changed.
# isHelper  - Boolean. Is current file included with brunch plugin?
#
# Returns nothing.
changeFileList = (compilers, linters, fileList, path, isHelper) ->
  compiler = compilers.filter(isPluginFor path)[0]
  currentLinters = linters.filter(isPluginFor path)
  fileList.emit 'change', path, compiler, currentLinters, isHelper

# Generate function that consolidates all needed info and generate files.
#
# config     - Object. Application config.
# joinConfig - Object. Generated from app config by `getJoinConfig()`
# fileList   - `fs_utils.FileList` instance.
# minifiers  - Array. Brunch plugins that are treated as minifiers.
# watcher    - `chokidar.FSWatcher` instance.
# callback   - Function. Will receive an array of `fs_utils.GeneratedFile`.
# startTime  - Number. Timestamp of a moment when compilation started.
#
# Returns Function.
getCompileFn = (config, joinConfig, fileList, minifiers, watcher, callback) -> (startTime) ->
  assetErrors = fileList.getAssetErrors()
  if assetErrors?
    assetErrors.forEach (error) -> logger.error error
    return

  # Determine which files has been changed,
  # create new `fs_utils.GeneratedFile` instances and write them.
  fs_utils.write fileList, config, joinConfig, minifiers, startTime, (error, generatedFiles) ->
    if error?
      if Array.isArray error
        error.forEach (subError) ->
          logger.error subError
      else
        logger.error error
    else
      logger.info "compiled in #{Date.now() - startTime}ms"

    # If it’s single non-continuous build, close file watcher and
    # exit process with correct exit code.
    unless config.persistent
      watcher.close()
      process.on 'exit', (previousCode) ->
        process.exit (if logger.errorHappened then 1 else previousCode)

    return if error?
    # Just pass `fs_utils.GeneratedFile` instances to callbacks.
    callback generatedFiles

# Generate function that restarts brunch process.
#
# config    - application config.
# options   - options that would be passed to new watcher.
# onCompile - callback that will be passed to new watcher.
# watcher   - chokidar.FSWatcher instance that has `close()` method.
# server    - instance of HTTP server that has `close()` method.
# reInstall - should brunch run `npm install` before rewatching?
#
# Returns Function.
getReloadFn = (config, options, onCompile, watcher, server) -> (reInstall) ->
  reWatch = ->
    server?.close?()
    watcher.close()
    watch(config.persistent, options, onCompile)
  if reInstall
    helpers.install config.paths.root, reWatch
  else
    reWatch()

# Load brunch plugins, group them and initialise file watcher.
#
# options      - Object. {configPath[, minify, server, port]}.
# configParams - Object. Optional. Params will be set as default config params.
# onCompile    - Function. Will be executed after every successful compilation.
# callback     - Function.
#
# Returns nothing.
initialize = (options, configParams, onCompile, callback) ->
  helpers.loadPackages helpers.pwd(), (error, packages) ->
    return callback error if error?
    # Load config, get brunch packages from package.json.
    config     = helpers.loadConfig options.configPath, configParams
    joinConfig = config._normalized.join
    plugins    = helpers.getPlugins packages, config

    # Get compilation methods.
    compilers  = plugins.filter(propIsFunction 'compile')
    linters    = plugins.filter(propIsFunction 'lint')
    minifiers  = plugins.filter(propIsFunction 'minify').concat(
      plugins.filter(propIsFunction 'optimize')
    )
    callbacks  = plugins.filter(propIsFunction 'onCompile').map((plugin) -> (args...) -> plugin.onCompile args...)

    # Add default brunch callback.
    callbacks.push onCompile
    callCompileCallbacks = (generatedFiles) ->
      callbacks.forEach (callback) ->
        callback generatedFiles
    fileList   = new fs_utils.FileList config
    if config.persistent and config.server.run
      server   = helpers.startServer config

    # Emit `change` event for each file that is included with plugins.
    getPluginIncludes(plugins).forEach (path) ->
      changeFileList compilers, linters, fileList, path, yes

    # Initialise file watcher.
    initWatcher config, (error, watcher) ->
      return callback error if error?
      # Get compile and reload functions.
      compile = getCompileFn config, joinConfig, fileList, minifiers, watcher, callCompileCallbacks
      reload = getReloadFn config, options, onCompile, watcher, server
      callback error, {
        config, watcher, server, fileList, compilers, linters, compile, reload
      }

# Binds needed events to watcher.
#
# config    - application config.
# fileList  - `fs_utils.FileList` instance.
# compilers - array of brunch plugins that can compile source code.
# watcher   - `chokidar.FSWatcher` instance.
# reload    - function that will reload the whole thing.
# onChange  - callback that will be executed every time any file is changed.
#
# Returns nothing.
bindWatcherEvents = (config, fileList, compilers, linters, watcher, reload, onChange) ->
  watcher
    .on 'add', (path) ->
      # Update file list.
      onChange()
      changeFileList compilers, linters, fileList, path, no
    .on 'change', (path) ->
      # If file is special (config.coffee, package.json), restart Brunch.
      if path is config.paths.config
        reload no
      else if path is config.paths.packageConfig
        reload yes
      else
        # Otherwise, just update file list.
        onChange()
        changeFileList compilers, linters, fileList, path, no
    .on 'unlink', (path) ->
      # If file is special (config.coffee, package.json), exit.
      # Otherwise, just update file list.
      if path is config.paths.config or path is config.paths.packageConfig
        logger.info "Detected removal of config.coffee / package.json.
Exiting."
        process.exit(0)
      else
        onChange()
        fileList.emit 'unlink', path

# persistent - Boolean: should brunch build the app only once or watch it?
# options    - Object: {configPath, minify, server, port}. Only configPath is
#              needed.
# onCompile  - Function that will be executed after every successful
#              compilation. May receive an array of `fs_utils.GeneratedFile`.
#
# this.config is an application config.
# this._start is a mutable timestamp that represents latest compilation
# start time. It is `null` when there are no compilations.
class BrunchWatcher
  constructor: (persistent, options, onCompile) ->
    configParams = generateParams persistent, options
    initialize options, configParams, onCompile, (error, result) =>
      return logger.error error if error?
      {config, watcher, fileList, compilers, linters, compile, reload} = result
      logger.notifications = config.notifications
      bindWatcherEvents config, fileList, compilers, linters, watcher, reload, @_startCompilation
      fileList.on 'ready', => compile @_endCompilation()
      @config = config

  # Set start time of last compilation to current time.
  # Returns Number.
  _startCompilation: =>
    @_start ?= Date.now()

  # Get last compilation start time and reset the state.
  # Returns Number.
  _endCompilation: =>
    start = @_start
    @_start = null
    start

module.exports = watch = (persistent, options, callback = (->)) ->
  new BrunchWatcher(persistent, options, callback)
