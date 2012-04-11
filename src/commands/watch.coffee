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

module.exports = watch = (persistent, options, callback = (->)) ->
  config = helpers.loadConfig options.configPath
  return callback() unless config?

  if persistent
    config.server.run = yes if options.server
    config.server.port = options.port if options.port

  {rootPath} = config

  ignored = (path) ->
    helpers.startsWith(path, config.paths.assets) or
    helpers.startsWith(sysPath.basename(path), '_')

  helpers.startServer config if persistent and config.server.run
  watchedFiles = [
    config.paths.app, config.paths.vendor, config.paths.config,
    sysPath.join(config.paths.root, 'package.json')
  ]

  helpers.loadPlugins config, (error, plugins) ->
    return logger.error error if error?
    fileList = new fs_utils.SourceFileList ignored
    start = null
    addToFileList = (isPluginHelper, path) ->
      start = Date.now()
      compiler = plugins.filter(isCompilerFor.bind(null, path))[0]
      fileList.add {path, compiler, isPluginHelper}

    removeFromFileList = (path) ->
      fileList.remove path

    plugins
      .map (plugin) ->
        paths = plugin.include
        if typeof paths is 'function'
          paths()
        else
          paths
      .filter (paths) ->
        paths?
      .forEach (paths) ->
        paths.forEach (path) ->
          addToFileList.bind(null, yes)

    # plugins.forEach (plugin) ->
    #   return unless plugin.include?
    #   includePaths = if typeof plugin.include is 'function'
    #     plugin.include()
    #   else
    #     plugin.include
    #   includePaths.forEach addToFileList.bind(null, yes)

    watcher = fs_utils.watch(watchedFiles)
      .on 'all', (event, path) ->
        logger.debug "File '#{path}' received event '#{event}'"
      .on('add', addToFileList.bind(null, no))
      .on 'change', (path) ->
        if path is config.paths.config
          # Reload app.
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
