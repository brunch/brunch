'use strict'

each = require 'async-each'
waterfall = require 'async-waterfall'
chokidar = require 'chokidar'
debug = require('debug')('brunch:watch')
sysPath = require 'path'
{spawn} = require 'child_process'
logger = require 'loggy'
pushserve = require 'pushserve'
# worker must be loaded before fs_utils
worker = require './worker'
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
  params = env: options.env?.split(',') or []
  if options.production? or options.optimize?
    params.env.unshift 'production'
  params.persistent = persistent
  if options.publicPath
    params.paths = {}
    params.paths.public = options.publicPath
  if persistent
    params.server = {}
    params.server.run = true if options.server
    params.server.port = options.port if options.port
  params

startServer = (config, callback = ->) ->
  serverOpts = config.server or {}
  port = parseInt config.server.port, 10
  publicPath = config.paths.public

  serverCb = ->
    clearTimeout customServerTimeout
    logger.info if config.server.path or config.server.command
      'custom server started, initializing watcher'
    else
       "application started on http://localhost:#{port}/"
    callback()

  if config.server.path
    logger.info 'starting custom server'
    try
      server = require sysPath.resolve config.server.path
    catch error
      logger.error "couldn't load server #{config.server.path}: #{error}"

    serverFn = if typeof server is 'function'
      server
    else if typeof server?.startServer is 'function'
      server.startServer.bind(server)
    else
      throw new Error 'Brunch server file needs to have startServer function'

    opts = {port, path: publicPath}
    serverConfig = helpers.extend opts, serverOpts.config or {}
    debug "Invoking custom startServer with: #{JSON.stringify serverConfig}"

    customServerTimeout = setTimeout ->
      logger.warn 'custom server taking a long time to start'
      logger.warn '**don\'t forget to invoke callback()**'
    , 5000

    switch serverFn.length
      when 1 then serverFn serverCb
      when 2 then serverFn serverConfig, serverCb
      else serverFn port, publicPath, serverCb

  else if config.server.command
    commandComponents = config.server.command.split ' '
    debug "Invoking custom server command with: #{config.server.command}"
    unless commandComponents.length
      throw new Error 'Custom server command invalid'
    child = spawn commandComponents.shift(), commandComponents, stdio: 'inherit'
    # fn to kill the custom server
    child.close = (cb) =>
      child.kill()
      cb?()

    serverCb()
    child
  else
    opts = noLog: yes, path: publicPath
    pushserve helpers.extend(opts, serverOpts), serverCb

# Filter paths that exist and watch them with `chokidar` package.
#
# config   - application config
# callback - Function that will take (error, `chokidar.FSWatcher` instance).
#
# Returns nothing.
initWatcher = (config, callback) ->
  {allConfigFiles} = config._normalized.paths
  {npm, bower, component} = config._normalized.packageInfo
  getFiles = (pkgs) -> [].concat.apply [], pkgs.components.map (_) -> _.files
  watched = config.paths.watched.concat(
    allConfigFiles, getFiles(npm), getFiles(bower), getFiles(component)
  )

  exists = (path, callback) ->
    fs_utils.exists path, (value) ->
      callback undefined, value

  each watched, exists, (err, existing) ->
    watchedFiles = watched.filter((_, index) -> existing[index])
    params = ignored: fs_utils.ignored, persistent: config.persistent, usePolling: config.watcher?.usePolling
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
    /$0^/ # never match
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

generateCompilationLog = (startTime, allAssets, generatedFiles, disposedFiles) ->
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
      isChanged = true if not isChanged and generatedFile in disposedFiles.generated
    if isChanged
      generated.push getName generatedFile
      cachedCount += (generatedFile.sourceFiles.length - locallyCompiledCount)

  compiledCount = compiled.length
  copiedCount = copied.length
  disposedCount = disposedFiles.sourcePaths.length

  generatedLog = switch generated.length
    when 0 then ''
    when 1 then " into #{generated[0]}"
    else " into #{generated.length} files"

  compiledLog = switch compiledCount
    when 0
      switch disposedCount
        when 0 then ''
        when 1 then "removed #{disposedFiles.sourcePaths[0]}"
        else "removed #{disposedCount}"
    when 1 then "compiled #{compiled[0]}"
    else "compiled #{compiledCount}"

  cachedLog = switch cachedCount
    when 0
      if compiledCount <= 1
        ''
      else
        ' files'
    else
      switch compiledCount
        when 0
          noun = if generated.length > 1 then '' else ' files'
          " and wrote #{cachedCount} cached#{noun}"
        when 1
          cachedCountName = "file#{if cachedCount is 1 then '' else 's'}"
          " and #{cachedCount} cached #{cachedCountName}"
        else " files and #{cachedCount} cached"

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
  diff = Date.now() - startTime

  "#{if main then main else 'compiled'} in #{diff}ms"

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
getCompileFn = (config, joinConfig, fileList, optimizers, watcher, preCompile, callback) -> (startTime, watcherReady) ->
  assetErrors = fileList.getAssetErrors()
  if assetErrors?
    assetErrors.forEach (error) -> logger.error error
    return

  # Determine which files has been changed,
  # create new `fs_utils.GeneratedFile` instances and write them.
  writeCb = (error, generatedFiles, disposed) ->
    if error?
      if Array.isArray error
        error.forEach (subError) ->
          logger.error subError
      else
        logger.error error
    else
      logger.info generateCompilationLog startTime, fileList.assets, generatedFiles, disposed
      # pass `fs_utils.GeneratedFile` instances to callbacks.
      callback generatedFiles

    return unless watcherReady

    # If it’s single non-continuous build, close file watcher and
    # exit process with correct exit code.
    unless config.persistent
      watcher.close()
      worker.close()
      process.on 'exit', (previousCode) ->
        process.exit (if logger.errorHappened then 1 else previousCode)

    fileList.initial = false

  if preCompile
    preCompile (error) ->
      if error?
        logger.error error
      else
        fs_utils.write fileList, config, joinConfig, optimizers, startTime, writeCb
  else
    fs_utils.write fileList, config, joinConfig, optimizers, startTime, writeCb

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
      worker.close()
      watch config.persistent, null, options, onCompile
    plugins.forEach (plugin) -> plugin.teardown?()
    if server?.close?
      server.close restart
    else
      restart()

  if reInstall
    helpers.install config.paths.root, 'npm', reWatch
  else
    logger.info "Reloading watcher..."
    reWatch()

getPlugins = (packages, config) ->
  packages
    .filter (plugin) ->
      if worker.isWorker and config.workers?.extensions
        return false unless plugin::?.extension in config.workers.extensions
      plugin::?.brunchPlugin and (not worker.isWorker or plugin::?.compile or plugin::?.lint)
    .map (plugin) ->
      instance = new plugin config
      instance.brunchPluginName = plugin.brunchPluginName
      instance

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
    requireModule = (depPath, dependencyName) ->
      plugin = require depPath
      plugin.brunchPluginName = dependencyName
      plugin
    deps
      .filter (dependency) ->
        dependency isnt 'brunch' and dependency.indexOf('brunch') isnt -1
      .map (dependency) ->
        depPath = "#{nodeModules}/#{dependency}"
        if isDev
          try
            requireModule depPath, dependency
          catch e
            null
        else
          try
            requireModule depPath, dependency
          catch error
            throw new Error "You probably need to execute `npm install` to install brunch plugins. #{error}"
  plugins = loadDeps(Object.keys json.dependencies or {})
  devPlugins = loadDeps(Object.keys(json.devDependencies or {}), true)
  optPlugins = loadDeps(Object.keys(json.optionalDependencies or {}), true)
  plugins.concat(devPlugins.concat(optPlugins).filter((_) -> _?))

# Load brunch plugins, group them and initialise file watcher.
#
# options      - Object. {config[, optimize, server, port]}.
# configParams - Object. Optional. Params will be set as default config params.
# onCompile    - Function. Will be executed after every successful compilation.
# callback     - Function.
#
# Returns nothing.
initialize = (options, configParams, onCompile, callback) ->
  # Load config, get brunch packages from package.json.
  helpers.loadConfig options.config, configParams, (error, config) ->
    logger.notifications = config.notifications
    logger.notificationsTitle = config.notificationsTitle or 'Brunch'
    if options.config?
      logger.warn '`-c, --config` option is deprecated. Use `--env` and `config.overrides` instead'
    if options.optimize?
      logger.warn '`-o, --optimize` option is deprecated. Use `-P, --production` instead'
    joinConfig = config._normalized.join
    packages = (loadPackages '.').filter ({brunchPluginName}) ->
      if config.plugins.off?.length and brunchPluginName in config.plugins.off
        false
      else if config.plugins.only?.length and brunchPluginName not in config.plugins.only
        false
      else
        true

    unfiltered = getPlugins packages, config
    alwaysEnabled = config.plugins.on or []

    plugins = unfiltered.filter (plugin) ->
      # backward compatibility for legacy optimizers
      plugin.optimize ?= plugin.minify if typeof plugin.minify is 'function'

      # Does the user's config say this plugin should definitely be used?
      return true if plugin.brunchPluginName in alwaysEnabled

      # If the plugin is an optimizer that doesn't specify a defaultEnv
      # decide based on the config.optimize setting
      return config.optimize if plugin.optimize and not plugin.defaultEnv

      # Use plugin-specified defaultEnv or assume it's meant for any env
      env = plugin.defaultEnv ?= '*'

      # Finally, is it meant for either any environment or an active environment?
      env is '*' or env in config.env

    debug "Loaded plugins: #{plugins.map((plugin) -> plugin.brunchPluginName).join(', ')}"

    # Get compilation methods.
    compilers  = plugins.filter propIsFunction 'compile'
    linters    = plugins.filter propIsFunction 'lint'
    optimizers = plugins.filter propIsFunction 'optimize'

    # Get plugin preCompile callbacks
    preCompilers = plugins.filter(propIsFunction 'preCompile').map((plugin) -> (args..., cb) -> plugin.preCompile(cb))

    # Add preCompile callback from config
    if typeof config.preCompile is 'function'
      preCompilers.push (args..., cb) -> config.preCompile(cb)
    callPreCompillers = (cb) ->
      waterfall(preCompilers, cb)

    # Get plugin onCompile callbacks
    callbacks  = plugins.filter(propIsFunction 'onCompile').map((plugin) -> (args...) -> plugin.onCompile args...)

    # Add onCompile callback from config
    if typeof config.onCompile is 'function'
      callbacks.push config.onCompile

    # Add default brunch callback.
    callbacks.push onCompile
    callCompileCallbacks = (generatedFiles) ->
      callbacks.forEach (callback) ->
        callback generatedFiles
    fileList = new fs_utils.FileList config

    if worker.isWorker
      return callback null, {config, fileList, compilers, linters}

    launchWatcher = ->
      # Initialise file watcher.
      initWatcher config, (error, watcher) ->
        return callback error if error?
        # Get compile and reload functions.
        compile = getCompileFn config, joinConfig, fileList, optimizers, watcher, callPreCompillers, callCompileCallbacks
        reload = getReloadFn config, options, onCompile, watcher, server, plugins
        includes = getPluginIncludes(plugins)
        callback error, {
          config, watcher, server, fileList, compilers, linters, compile, reload, includes
        }

    if config.persistent and config.server.run
      server = startServer config, launchWatcher
    else
      launchWatcher()

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
  {possibleConfigFiles} = config._normalized.paths
  {packageConfig, bowerConfig} = config.paths

  changeHandler = (path) ->
    onChange()
    changeFileList compilers, linters, fileList, path, false

  if config.persistent
    process.stdin.on 'end', -> process.exit(0)
    process.stdin.resume()

  watcher
    .on('error', logger.error)
    .on 'add', (absPath) ->
      path = sysPath.relative config.paths.root, absPath
      isConfigFile = possibleConfigFiles[path]
      isPluginsFile = path in [packageConfig, bowerConfig]
      unless isConfigFile or isPluginsFile
        changeHandler path
    .on 'change', (absPath) ->
      path = sysPath.relative config.paths.root, absPath
      # If file is special (config.coffee, package.json), restart Brunch.
      isConfigFile = possibleConfigFiles[path]
      isPackageFile = path is packageConfig
      if isConfigFile or isPackageFile
        reload isPackageFile
      else if path is bowerConfig
        helpers.install config.paths.root, 'bower', reload
      else
        changeHandler path
    .on 'unlink', (absPath) ->
      path = sysPath.relative config.paths.root, absPath
      # If file is special (config.coffee, package.json), exit.
      # Otherwise, just update file list.
      isConfigFile = possibleConfigFiles[path]
      isPackageFile = path is packageConfig
      if isConfigFile or isPackageFile
        logger.info "Detected removal of config.coffee / package.json.\nExiting."
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
    @_start = Date.now()
    configParams = generateParams persistent, options
    initialize options, configParams, onCompile, (error, result) =>
      return logger.error error if error?
      {@config, watcher, fileList, compilers, linters, compile, reload, includes} = result
      if @config.workers?.enabled
        return unless worker {changeFileList, compilers, linters, fileList, @config}

      bindWatcherEvents @config, fileList, compilers, linters, watcher, reload, @_startCompilation
      watcherReady = false
      watcher.once 'ready', -> watcherReady = true
      fileList.on 'ready', => compile @_endCompilation(), watcherReady if @_start
      # Emit `change` event for each file that is included with plugins.
      # Wish it worked like `watcher.add includes`.
      includes.forEach (path) =>
        relative = sysPath.relative @config.paths.root, path
        changeFileList compilers, linters, fileList, relative, true

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

module.exports = watch = (persistent, path, options, callback = (->)) ->
  process.chdir path if path
  new BrunchWatcher(persistent, options, callback)
