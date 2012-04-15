async = require 'async'
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
  constructor: (@persistent, @options, @onCompile) ->
    params = {}
    params.minify = yes if options.minify
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
    watchedButIgnored = (path) =>
      helpers.startsWith(path, @config.paths.assets) or
      helpers.startsWith(sysPath.basename(path), '_')
    @fileList = new fs_utils.SourceFileList watchedButIgnored

  initPlugins: (callback) ->
    helpers.loadPlugins @config, (error, plugins) =>
      return logger.error error if error?
      @plugins = plugins
      callback error

  addToFileList: (isPluginHelper, path) =>
    @start = Date.now()
    compiler = @plugins.filter(isCompilerFor.bind(null, path))[0]
    @fileList.add {path, compiler, isPluginHelper}

  removeFromFileList: (path) =>
    @start = Date.now()
    @fileList.remove path

  initWatcher: (callback) ->
    watched = [
      @config.paths.app, @config.paths.vendor,
      @config.paths.config, @config.paths.packageConfig
    ]
    async.filter watched, fs_utils.exists, (watchedFiles) =>
      @watcher = fs_utils.watch(watchedFiles)
        .on 'all', (event, path) =>
          logger.debug "File '#{path}' received event '#{event}'"
        .on('add', @addToFileList.bind(this, no))
        .on 'change', (path) =>
          if path is @config.paths.config
            @reload no
          else if path is @config.paths.packageConfig
            @reload yes
          else
            @addToFileList no, path
        .on('unlink', @removeFromFileList)
        .on('error', logger.error)

  compile: =>
    paths = @config.paths
    fs_utils.write @fileList, @config, @plugins, (error, result) =>
      fs_utils.copyIfExists paths.assets, paths.build, yes, (error) =>
        logger.error "Asset compilation failed: #{error}" if error?
        logger.info "compiled."
        logger.debug "compilation time: #{Date.now() - @start}ms"
        @watcher.close() unless @persistent
        @onCompile null, result

  watch: ->
    @initServer()
    @initPlugins =>
      @initFileList()
      getPluginIncludes(@plugins).forEach(@addToFileList.bind(this, yes))
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
