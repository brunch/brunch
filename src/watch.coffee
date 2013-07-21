'use strict'

each = require 'async-each'
chokidar = require 'chokidar'
debug = require('debug')('brunch:watch')
sysPath = require 'path'
logger = require 'loggy'
pushserve = require 'pushserve'
fs_utils = require './fs_utils'
helpers = require './helpers'

# Get paths to files that plugins include. E.g. handlebars-brunch includes
# `../vendor/handlebars-runtime.js` with path relative to plugin.
#
# plugins - Array of brunch plugins.
#
# Returns Array of Strings.
getPluginIncludes = (plugins) ->
  getValue = (thing, context = this) ->
    if typeof thing is 'function' then thing.call(context) else thing

  ensureArray = (object) ->
    if Array.isArray object then object else [object]

  plugins
    .map((plugin) -> getValue plugin.include, plugin)
    .filter((paths) -> paths?)
    .reduce(((acc, elem) -> acc.concat(ensureArray elem)), [])

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
    params.server.run = true if options.server
    params.server.port = options.port if options.port
  params

startServer = (config, callback = (->)) ->
  serverOpts = config.server or {}
  port = parseInt config.server.port, 10
  publicPath = config.paths.public
  log = ->
    logger.info "application started on http://localhost:#{port}/"
    callback()
  if config.server.path
    try
      server = require sysPath.resolve config.server.path
    catch error
      logger.error "couldn\'t load server #{config.server.path}: #{error}"
    unless server.startServer?
      throw new Error 'Brunch server file needs to have startServer function'
    server.startServer port, publicPath, log
  else
    opts = noLog: yes, path: publicPath
    pushserve helpers.extend(opts, serverOpts), log

# Filter paths that exist and watch them with `chokidar` package.
#
# config   - application config
# callback - Function that will take (error, `chokidar.FSWatcher` instance).
#
# Returns nothing.
initWatcher = (config, callback) ->
  watched = config.paths.watched.concat [
    config.paths.config, config.paths.packageConfig
  ]
  watched = watched.concat.apply watched, config._normalized.bowerComponents.map (_) -> _.files

  Object.keys(require.extensions).forEach (ext) ->
    watched.push config.paths.config + ext

  exists = (path, callback) ->
    fs_utils.exists path, (value) ->
      callback undefined, value

  each watched, exists, (err, existing) ->
    watchedFiles = watched.filter((_, index) -> existing[index])
    params = ignored: fs_utils.ignored, persistent: config.persistent
    callback null, chokidar.watch watchedFiles, params

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
  compiler = compilers.filter(isPluginFor path)
  currentLinters = linters.filter(isPluginFor path)
  fileList.emit 'change', path, compiler, currentLinters, isHelper

changedSince = (startTime) -> (generated) ->
  generated.sourceFiles.some (sourceFile) ->
    sourceFile.compilationTime >= startTime or sourceFile.removed

generateCompilationLog = (startTime, allAssets, generatedFiles) ->
  # compiled 4 files and 145 cached files into app.js
  # compiled app.js and 10 cached files into app.js, copied 2 files
  # `compiled 106 into 3 and copied 47 files` - initial compilation
  # `copied img.png` - 1 new/changed asset
  # `copied 6 files` - >1 new/changed asset
  # `compiled controller.coffee and 32 cached files into app.js` - change 1 source file
  # `compiled _partial.styl and 22 cached into 2 files` - change 1 partial affecting >1 compiled file
  # `compiled init.ls into init.js` - change 1 source file that doesn't concat with any other files
  # `compiled 5 files into ie7.css` - change all source files that go into 1 compiled
  # `compiled 2 and 3 cached files into ie7.css` - change some source files that go into 1 compiled
  # `compiled 4 files and 1 cached into ie7.css` - 1 cached should not switch to filename
  # `compiled 5 and 101 cached into 3 files` - change >1 affecting >1 compiled
  getName = (file) -> sysPath.basename file.path
  copied = allAssets.filter((_) -> _.copyTime > startTime).map(getName)
  generated = []
  compiled = []
  cachedCount = 0

  generatedFiles.forEach (generatedFile) ->
    isChanged = false
    locallyCompiledCount = 0
    generatedFile.sourceFiles.forEach (sourceFile) ->
      if sourceFile.compilationTime >= startTime
        isChanged = true
        locallyCompiledCount += 1
        sourceName = getName sourceFile
        compiled.push sourceName unless sourceName in compiled
    if isChanged
      generated.push getName generatedFile
      cachedCount += (generatedFile.sourceFiles.length - locallyCompiledCount)

  compiledCount = compiled.length
  copiedCount = copied.length

  generatedLog = switch generated.length
    when 0 then ''
    when 1 then " into #{generated[0]}"
    else " into #{generated.length} files"

  compiledLog = switch compiledCount
    when 0 then ''
    when 1 then "compiled #{compiled[0]}"
    else "compiled #{compiled.length}"

  cachedLog = switch cachedCount
    when 0
      if compiledCount is 0 or compiledCount is 1
        ''
      else
        ' files'
    else
      if compiledCount is 1
        cachedCountName = "file#{if cachedCount is 1 then '' else 's'}"
        " and #{cachedCount} cached #{cachedCountName}"
      else
        " files and #{cachedCount} cached"

  nonAssetsLog = compiledLog + cachedLog + generatedLog

  sep = if nonAssetsLog and copiedCount isnt 0 then ', ' else ''

  assetsLog = switch copiedCount
    when 0 then ''
    when 1 then "copied #{copied[0]}"
    else
      if compiled.length is 0
        "copied #{copiedCount} files"
      else
        "copied #{copiedCount}"

  main = nonAssetsLog + sep + assetsLog

  "#{if main then main else 'compiled'} in #{Date.now() - startTime}ms"

# Generate function that consolidates all needed info and generate files.
#
# config     - Object. Application config.
# joinConfig - Object. Generated from app config by `getJoinConfig()`
# fileList   - `fs_utils.FileList` instance.
# optimizers  - Array. Brunch plugins that are treated as optimizers.
# watcher    - `chokidar.FSWatcher` instance.
# callback   - Function. Will receive an array of `fs_utils.GeneratedFile`.
# startTime  - Number. Timestamp of a moment when compilation started.
#
# Returns Function.
getCompileFn = (config, joinConfig, fileList, optimizers, watcher, callback) -> (startTime) ->
  assetErrors = fileList.getAssetErrors()
  if assetErrors?
    assetErrors.forEach (error) -> logger.error error
    return

  # Determine which files has been changed,
  # create new `fs_utils.GeneratedFile` instances and write them.
  fs_utils.write fileList, config, joinConfig, optimizers, startTime, (error, generatedFiles) ->
    if error?
      if Array.isArray error
        error.forEach (subError) ->
          logger.error subError
      else
        logger.error error
    else
      logger.info generateCompilationLog startTime, fileList.assets, generatedFiles

    # If it’s single non-continuous build, close file watcher and
    # exit process with correct exit code.
    unless config.persistent
      watcher.close()
      process.on 'exit', (previousCode) ->
        process.exit (if logger.errorHappened then 1 else previousCode)

    fileList.initial = false

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
# plugins   - brunch plugins.
# reInstall - should brunch run `npm install` before rewatching?
#
# Returns Function.
getReloadFn = (config, options, onCompile, watcher, server, plugins) -> (reInstall) ->
  reWatch = ->
    restart = ->
      watcher.close()
      watch config.persistent, options, onCompile
    plugins.forEach (plugin) -> plugin.teardown?()
    if server?.close?
      server.close restart
    else
      restart()

  if reInstall
    helpers.install config.paths.root, reWatch
  else
    logger.info "Reloading watcher..."
    reWatch()

getPlugins = (packages, config) ->
  packages
    .filter((plugin) -> plugin.prototype?.brunchPlugin)
    .map((plugin) -> new plugin config)

loadPackages = (rootPath, callback) ->
  rootPath = sysPath.resolve rootPath
  nodeModules = "#{rootPath}/node_modules"
  try
    packagePath = sysPath.join rootPath, 'package.json'
    delete require.cache[require.resolve packagePath]
    json = require packagePath
  catch err
    throw new Error "Current directory is not brunch application root path,
 as it does not contain package.json (#{err})"
  # TODO: test if `brunch-plugin` is in dep’s package.json.
  loadDeps = (deps, isDev) ->
    deps
      .filter (dependency) ->
        dependency isnt 'brunch' and dependency.indexOf('brunch') isnt -1
      .map (dependency) ->
        depPath = "#{nodeModules}/#{dependency}"
        if isDev
          try
            require depPath
          catch e
            null
        else
          try
            require depPath
          catch error
            throw new Error "You probably need to execute `npm install` to install brunch plugins. #{error}"
  plugins = loadDeps(Object.keys json.dependencies)
  devPlugins = loadDeps(Object.keys(json.devDependencies or {}), true)
  plugins.concat(devPlugins.filter((_) -> _?))

# Load brunch plugins, group them and initialise file watcher.
#
# options      - Object. {config[, optimize, server, port]}.
# configParams - Object. Optional. Params will be set as default config params.
# onCompile    - Function. Will be executed after every successful compilation.
# callback     - Function.
#
# Returns nothing.
initialize = (options, configParams, onCompile, callback) ->
  packages = loadPackages '.'

  # Load config, get brunch packages from package.json.
  helpers.loadConfig options.config, configParams, (error, config) ->
    joinConfig = config._normalized.join
    plugins    = getPlugins packages, config

    # Get compilation methods.
    compilers  = plugins.filter(propIsFunction 'compile')
    compilers.forEach (_) ->
      _._compile = if _.compile.length is 2
        _.compile
      else
        fn = _.compile.bind(_)
        (params, callback) ->
          fn params.data, params.path, (error, params) ->
            return callback error if error?
            result = if typeof params is 'object'
              params
            else
              {data: params}
            callback null, result

    linters    = plugins.filter(propIsFunction 'lint')
    optimizers = plugins.filter(propIsFunction 'optimize').concat(
      plugins.filter(propIsFunction 'minify')
    )
    optimizers.forEach (_) ->
      _._optimize = if _.optimize?.length is 2
        _.optimize
      else
        fn = (_.optimize or _.minify).bind(_)
        (params, callback) ->
          fn params.data, params.path, (error, params) ->
            return callback error if error?
            result = if typeof params is 'object'
              params
            else
              {data: params}
            callback null, result

    callbacks  = plugins.filter(propIsFunction 'onCompile').map((plugin) -> (args...) -> plugin.onCompile args...)

    # Add default brunch callback.
    callbacks.push onCompile
    callCompileCallbacks = (generatedFiles) ->
      callbacks.forEach (callback) ->
        callback generatedFiles
    fileList   = new fs_utils.FileList config
    if config.persistent and config.server.run
      server   = startServer config

    # Initialise file watcher.
    initWatcher config, (error, watcher) ->
      return callback error if error?
      # Get compile and reload functions.
      compile = getCompileFn config, joinConfig, fileList, optimizers, watcher, callCompileCallbacks
      reload = getReloadFn config, options, onCompile, watcher, server, plugins
      includes = getPluginIncludes(plugins)
      callback error, {
        config, watcher, server, fileList, compilers, linters, compile, reload, includes
      }

isConfigFile = (basename, configPath) ->
  files = Object.keys(require.extensions).map (_) -> configPath + _
  files.some (file) ->
    basename is file

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
  possibleConfigFiles = Object.keys(require.extensions)
    .map (_) ->
      config.paths.config + _
    .reduce (obj, _) ->
      obj[_] = true
      obj
    , {}

  watcher
    .on('error', logger.error)
    .on 'add', (path) ->
      isConfigFile = possibleConfigFiles[path]
      isPluginsFile = path is config.paths.packageConfig
      unless isConfigFile or isPluginsFile
        # Update file list.
        onChange()
        changeFileList compilers, linters, fileList, path, false
    .on 'change', (path) ->
      # If file is special (config.coffee, package.json), restart Brunch.
      isConfigFile = possibleConfigFiles[path]
      isPluginsFile = path is config.paths.packageConfig
      if isConfigFile or isPluginsFile
        reload isPluginsFile
      else
        # Otherwise, just update file list.
        onChange()
        changeFileList compilers, linters, fileList, path, false
    .on 'unlink', (path) ->
      # If file is special (config.coffee, package.json), exit.
      # Otherwise, just update file list.
      isConfigFile = possibleConfigFiles[path]
      isPluginsFile = path is config.paths.packageConfig
      if isConfigFile or isPluginsFile
        logger.info "Detected removal of config.coffee / package.json.
Exiting."
        process.exit(0)
      else
        onChange()
        fileList.emit 'unlink', path
  if process.env.DEBUG
    watcher.on 'all', (event, path) ->
      debug "File '#{path}' received event '#{event}'"

# persistent - Boolean: should brunch build the app only once or watch it?
# options    - Object: {configPath, optimize, server, port}. Only configPath is
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
      {config, watcher, fileList, compilers, linters, compile, reload, includes} = result
      logger.notifications = config.notifications
      logger.notificationsTitle = config.notificationsTitle or 'Brunch'
      bindWatcherEvents config, fileList, compilers, linters, watcher, reload, @_startCompilation
      fileList.on 'ready', => compile @_endCompilation()
      # Emit `change` event for each file that is included with plugins.
      @config = config
      # Wish it worked like `watcher.add includes`.
      includes.forEach (path) ->
        changeFileList compilers, linters, fileList, path, true

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
