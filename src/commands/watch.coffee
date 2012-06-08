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
    @changedFiles = {}

  clone: ->
    new BrunchWatcher(@persistent, @options, @onCompile)

  initServer: ->
    if @persistent and @config.server.run
      @server = helpers.startServer @config

  initFileList: ->
    @fileList = new fs_utils.FileList @config

  initPlugins: (callback) ->
    helpers.loadPlugins @config, (error, plugins) =>
      return logger.error error if error?
      @plugins = plugins
      callback error

  changeFileList: (path, isHelper = no) =>
    @start = Date.now()
    compilers = @plugins.filter(isCompilerFor.bind(null, path))
    types = compilers.filter((cmp)-> cmp.type?)
    @changedFiles[path] = if types.length is 0 then false else types[0].type
    @fileList.emit 'change', path, compilers[0], isHelper

  removeFromFileList: (path) =>
    if not @changedFiles[path]? then @changedFiles[path] = false
    @start = Date.now()
    @fileList.emit 'unlink', path

  initWatcher: (callback) ->
    watched = [
      @config.paths.app, @config.paths.vendor, @config.paths.test,
      @config.paths.config, @config.paths.packageConfig
    ].concat(@config.paths.assets)

    async.filter watched, fs_utils.exists, (watchedFiles) =>
      ignored = fs_utils.ignored
      @watcher = chokidar.watch(watchedFiles, {ignored, @persistent})
        .on 'add', (path) =>
          logger.debug "File '#{path}' received event 'add'"
          @changeFileList path, no
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
          if path in [@config.paths.config, @config.paths.packageConfig]
            logger.info "Detected removal of config.coffee / package.json.\nExiting."
            process.exit(0)
          else
            @removeFromFileList path
        .on('error', logger.error)

  onCompile: (result) =>
    @_onCompile @changedFiles
    @plugins
      .filter (plugin) ->
        typeof plugin.onCompile is 'function'
      .forEach (plugin) =>
        plugin.onCompile @changedFiles
    @changedFiles = []

  compile: =>
    fs_utils.write @fileList, @config, @plugins, (error, result) =>
      return logger.error "Write failed: #{error}" if error?
      logger.info "compiled in #{Date.now() - @start}ms"
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
