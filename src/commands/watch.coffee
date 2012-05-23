async = require 'async'
chokidar = require 'chokidar'
sysPath = require 'path'
helpers = require '../helpers'
logger = require '../logger'
fs_utils = require '../fs_utils'

isCompilerFor = (path, plugin) ->
  pattern = if plugin.pattern
    plugin.pattern
  else if plugin.extension
    ///\.#{plugin.extension}$///
  else
    null
  (typeof plugin.compile is 'function') and !!(pattern?.test path)

getPluginIncludes = (plugins) ->
  plugins
    .map (plugin) ->
      paths = plugin.include
      if typeof paths is 'function'
        paths()
      else
        paths
    .filter (paths) ->
      paths?
    # Flatten the array.
    .reduce (acc, elem) ->
      acc.concat(if Array.isArray(elem) then elem else [elem])
    , []

class BrunchWatcher
  constructor: (@persistent, @options, @_onCompile) ->
    params = {}
    params.minify = yes if options.minify
    params.persistent = persistent
    if persistent
      params.server = {}
      params.server.run = yes if options.server
      params.server.port = options.port if options.port
    @config = helpers.loadConfig options.configPath, params

  clone: ->
    new BrunchWatcher(@persistent, @options, @onCompile)

  initServer: ->
    if @persistent and @config.server.run
      @server = helpers.startServer @config

  initFileList: ->
    @fileList = new fs_utils.SourceFileList @config

  initPlugins: (callback) ->
    helpers.loadPlugins @config, (error, plugins) =>
      return logger.error error if error?
      @plugins = plugins
      callback error

  changeFileList: (path, isHelper = no) =>
    @start = Date.now()
    compiler = @plugins.filter(isCompilerFor.bind(null, path))[0]
    @fileList.emit 'change', path, compiler, isHelper

  removeFromFileList: (path) =>
    @start = Date.now()
    @fileList.emit 'unlink', path

  initWatcher: (callback) ->
    watched = [
      @config.paths.app, @config.paths.vendor,
      @config.paths.config, @config.paths.packageConfig
    ].concat(@config.paths.assets)

    async.filter watched, fs_utils.exists, (watchedFiles) =>
      ignored = fs_utils.ignored
      @watcher = chokidar.watch(watchedFiles, {ignored, @persistent})
        .on 'add', (path) =>
          logger.debug "File '#{path}' received event 'add'"
          @changeFileList path
        .on 'change', (path) =>
          logger.debug "File '#{path}' received event 'change'"
          if path is @config.paths.config
            @reload no
          else if path is @config.paths.packageConfig
            @reload yes
          else
            @changeFileList path, no
        .on 'unlink', (path) =>
          logger.debug "File '#{path}' received event 'unlink'"
          @removeFromFileList path
        .on('error', logger.error)

  onCompile: (result) =>
    @_onCompile result
    @plugins
      .filter (plugin) ->
        typeof plugin.onCompile is 'function'
      .forEach (plugin) ->
        plugin.onCompile result

  compile: =>
    paths = @config.paths
    copyAssets = (assetPath, callback) =>
      fs_utils.copyIfExists assetPath, paths.public, yes, callback

    fs_utils.write @fileList, @config, @plugins, (error, result) =>
      return logger.error "Write failed: #{error}" if error?
      async.forEach paths.assets, copyAssets, (error) =>
        return logger.error "Asset copying failed: #{error}" if error?
        logger.info "compiled."
        logger.debug "compilation time: #{Date.now() - @start}ms"
        @watcher.close() unless @persistent
        @onCompile result

  watch: ->
    @initServer()
    @initPlugins =>
      @initFileList()
      getPluginIncludes(@plugins).forEach((path) => @changeFileList path, yes)
      @initWatcher()
      @fileList.on 'ready', @compile

  close: ->
    @server?.close()
    @watcher.close()

  reload: (reInstall = no) ->
    reWatch = =>
      @close()
      @clone().watch()
    if reInstall
      helpers.install @config.paths.root, reWatch
    else
      reWatch()

module.exports = watch = (persistent, options, callback = (->)) ->
  deprecated = (param) ->
    if options[param]
      logger.warn "--#{param} is deprecated. Use config option."
  deprecated 'output'
  new BrunchWatcher(persistent, options, callback).watch()
