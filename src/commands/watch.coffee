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

  fileList = new fs_utils.SourceFileList

  helpers.loadPlugins config, (error, plugins) ->
    return logger.error error if error?
    start = null
    addToFileList = (isPluginHelper, path) ->
      start = Date.now()
      return fileList.resetTimer() if ignored path
      compiler = plugins.filter(isCompilerFor.bind(null, path))[0]
      return unless compiler
      fileList.add {path, compiler, isPluginHelper}

    removeFromFileList = (path) ->
      return fileList.resetTimer() if ignored path
      fileList.remove path

    plugins.forEach (plugin) ->
      return unless plugin.include?
      includePathes = if typeof plugin.include is 'function'
        plugin.include()
      else
        plugin.include
      includePathes.forEach addToFileList.bind(null, yes)

    watcher = fs_utils.watch watchedFiles, (event, path) ->
      logger.log 'debug', "File '#{path}' received event #{event}"
      switch event
        when 'success', 'change'
          addToFileList no, path
        when 'unlink'
          removeFromFileList path
        when 'error'
          logger.error path

    writer = new fs_utils.FileWriter config, plugins
    fileList.on 'resetTimer', -> writer.write fileList
    writer.on 'write', (result) ->
      copyIfExists = fs_utils.copyIfExists
      copyIfExists config.paths.assets, config.paths.build, yes, (error) ->
        logger.error "Asset compilation failed: #{error}" if error?
        logger.info "compiled."
        logger.log 'debug', "compilation time: #{Date.now() - start}ms"
        watcher.close() unless persistent
        callback null, result
