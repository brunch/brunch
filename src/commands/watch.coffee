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
    .reduce (acc, elem) ->
      acc.concat(if Array.isArray(elem) then elem else [elem])
    , []

startWatching = (watchedFiles, persistent, config, plugins, callback) ->
  helpers.startServer config if persistent and config.server.run
  {rootPath} = config
  fileList = new fs_utils.SourceFileList ignored
  start = null
  ignored = (path) ->
    helpers.startsWith(path, config.paths.assets) or
    helpers.startsWith(sysPath.basename(path), '_')
  addToFileList = (isPluginHelper, path) ->
    start = Date.now()
    compiler = plugins.filter(isCompilerFor.bind(null, path))[0]
    fileList.add {path, compiler, isPluginHelper}

  removeFromFileList = (path) ->
    fileList.remove path

  getPluginIncludes(plugins).forEach(addToFileList.bind(null, yes))

  watcher = fs_utils.watch(watchedFiles)
    .on 'all', (event, path) ->
      logger.debug "File '#{path}' received event '#{event}'"
    .on('add', addToFileList.bind(null, no))
    .on 'change', (path) ->
      if path is config.paths.config
        # Reload app.
        oldCallback = callback
        persistent = no
        callback = ->
          setTimeout ->
            watch yes, options, oldCallback
          , 2500
        fileList.resetTimer()
      else
        addToFileList no, path
    .on('unlink', removeFromFileList)
    .on('error', logger.error)

  fileList.on 'ready', ->
    fs_utils.write fileList, config, plugins, (error, result) ->
      copyIfExists = fs_utils.copyIfExists
      copyIfExists config.paths.assets, config.paths.build, yes, (error) ->
        logger.error "Asset compilation failed: #{error}" if error?
        logger.info "compiled."
        logger.debug "compilation time: #{Date.now() - start}ms"
        watcher.close() unless persistent
        callback null, result

module.exports = watch = (persistent, options, callback = (->)) ->
  # Initialize & load config.
  params = {}
  if persistent
    params.server = {}
    params.server.run = yes if options.server
    params.server.port = options.port if options.port
  config = helpers.loadConfig options.configPath, params
  return callback() unless config?

  watched = [
    config.paths.app, config.paths.vendor, config.paths.config,
    sysPath.join(config.paths.root, 'package.json')
  ]
  async.filter watched, fs_utils.exists, (watchedFiles) ->
    helpers.loadPlugins config, (error, plugins) ->
      return logger.error error if error?
      startWatching watchedFiles, persistent, config, plugins, callback
