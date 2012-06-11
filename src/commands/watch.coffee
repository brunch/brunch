'use strict'

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
    RegExp "\\.#{plugin.extension}$"
  else
    null
  (typeof plugin.compile is 'function') and !!(pattern?.test path)

getPluginIncludes = (plugins) ->
  plugins
    .map((plugin) -> plugin.include)
    .map(helpers.callFunctionOrPass)
    .filter((paths) -> paths?)
    .reduce(((acc, elem) -> acc.concat(helpers.ensureArray elem)), [])

makeUniversalChecker = (item) ->
  switch toString.call(item)
    when '[object RegExp]'
      (string) -> item.test string
    when '[object Function]'
      item
    else
      throw new Error("Config.files item #{item} is invalid.
Use RegExp or Function.")

listToObj = (acc, elem) ->
  acc[elem[0]] = elem[1]
  acc

# Converts `config.files[...].joinTo` to one format.
# config.files[type].joinTo can be a string, a map of {str: regexp} or a map
# of {str: function}.
# Example output:
# 
# {
#   javascripts: {'javascripts/app.js': checker},
#   templates: {'javascripts/app.js': checker2}
# }
# 
getJoinConfig = (config) ->
  types = Object.keys(config.files)
  result = types
    .map (type) =>
      config.files[type].joinTo
    .map (joinTo) =>
      if typeof joinTo is 'string'
        object = {}
        object[joinTo] = /.+/
        object
      else
        joinTo
    .map (joinTo, index) =>
      makeChecker = (generatedFilePath) =>
        [generatedFilePath, makeUniversalChecker(joinTo[generatedFilePath])]
      subConfig = Object.keys(joinTo).map(makeChecker).reduce(listToObj, {})
      [types[index], subConfig]
    .reduce(listToObj, {})
  Object.freeze(result)

class BrunchWatcher
  constructor: (@persistent, @options, @_onCompile) ->
    params = {}
    params.minify = Boolean options.minify
    params.persistent = persistent
    if options.publicPath
      params.paths = {}
      params.paths.public = options.publicPath
    if persistent
      params.server = {}
      params.server.run = yes if options.server
      params.server.port = options.port if options.port
    @config = helpers.loadConfig options.configPath, params
    @joinConfig = getJoinConfig @config

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
    @start ?= Date.now()
    compiler = @plugins.filter(isCompilerFor.bind(null, path))[0]
    @fileList.emit 'change', path, compiler, isHelper

  removeFromFileList: (path) =>
    @start ?= Date.now()
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
          logger.debug 'watcher', "File '#{path}' received event 'add'"
          @changeFileList path, no
        .on 'change', (path) =>
          logger.debug 'watcher', "File '#{path}' received event 'change'"
          if path is @config.paths.config
            @reload no
          else if path is @config.paths.packageConfig
            @reload yes
          else
            @changeFileList path, no
        .on 'unlink', (path) =>
          logger.debug 'watcher', "File '#{path}' received event 'unlink'"
          if path in [@config.paths.config, @config.paths.packageConfig]
            logger.info "Detected removal of config.coffee / package.json.
 Exiting."
            process.exit(0)
          else
            @removeFromFileList path
        .on('error', logger.error)
      callback()

  onCompile: (generatedFiles) =>
    @_onCompile generatedFiles
    @plugins
      .filter (plugin) ->
        typeof plugin.onCompile is 'function'
      .forEach (plugin) ->
        plugin.onCompile generatedFiles
    @start = null

  compile: =>
    fs_utils.write @fileList, @config, @joinConfig, @plugins, @start, (error, result) =>
      return logger.error "Write failed: #{error}" if error?
      logger.info "compiled in #{Date.now() - @start}ms"
      @watcher.close() unless @persistent
      @onCompile result

  watch: ->
    @initServer()
    @initPlugins =>
      @initFileList()
      getPluginIncludes(@plugins).forEach((path) => @changeFileList path, yes)
      @initWatcher =>
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
  new BrunchWatcher(persistent, options, callback).watch()
