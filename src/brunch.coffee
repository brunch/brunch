async = require 'async'
{exec, spawn} = require 'child_process'
fs = require 'fs'
mkdirp = require 'mkdirp'
{ncp} = require 'ncp'
sysPath = require 'path'
helpers = require './helpers'
logger = require './logger'
fs_utils = require './fs_utils'

isCompilerFor = (path) -> (plugin) ->
  pattern = if plugin.pattern
    plugin.pattern
  else if plugin.extension
    ///\.#{plugin.extension}$///
  else
    null
  (typeof plugin.compile is 'function') and !!(pattern?.test path)

# Recompiles all files in current working directory.
# 
# rootPath - path to application directory.
# config - Parsed app config.
# persistent - Should watcher be stopped after compiling the app first time?
# callback - Callback that would be executed on each compilation.
# 
# Returns `fs_utils.FSWatcher` object.
watchApplication = (persistent, rootPath, config, callback) ->
  config.buildPath ?= sysPath.join rootPath, 'public'
  config.server ?= {}
  config.server.port ?= 3333
  # Pass rootPath to config in order to allow plugins to use it.
  config.rootPath = rootPath
  assetPath = sysPath.join rootPath, 'app', 'assets'
  ignored = (path) ->
    helpers.startsWith(path, assetPath) or
    helpers.startsWith(sysPath.basename(path), '_')

  if persistent and config.server.run
    helpers.startServer config.server.port, config.buildPath, config
  directories = ['app', 'vendor'].map (dir) -> sysPath.join rootPath, dir

  fileList = new fs_utils.SourceFileList

  helpers.loadPlugins config, (error, plugins) ->
    return logger.error error if error?
    start = null
    addToFileList = (isPluginHelper) -> (path) ->
      start = Date.now()
      logger.log 'debug', "File '#{path}' was changed"
      return fileList.resetTimer() if ignored path
      compiler = plugins.filter(isCompilerFor path)[0]
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
      includePathes.forEach addToFileList yes

    writer = new fs_utils.FileWriter config, plugins
    watcher = (new fs_utils.FileWatcher)
      .add(directories)
      .on('change', addToFileList no)
      .on('remove', removeFromFileList)
    fileList.on 'resetTimer', -> writer.write fileList
    valid = (path) -> not watcher.invalid.test sysPath.basename path
    writer.on 'write', (result) ->
      assetPath = sysPath.join rootPath, 'app', 'assets'
      ncp assetPath, config.buildPath, filter: valid, (error) ->
        logger.error "Asset compilation failed: #{error}" if error?
        logger.info "compiled."
        logger.log 'debug', "compilation time: #{Date.now() - start}ms"
        watcher.close() unless persistent
        callback null, result
    watcher

generateFile = (path, data, callback) ->
  parentDir = sysPath.dirname path
  write = ->
    logger.info "create #{path}"
    fs.writeFile path, data, callback
  sysPath.exists parentDir, (exists) ->
    return write() if exists
    logger.info "create #{parentDir}"
    mkdirp parentDir, (parseInt 755, 8), (error) ->
      return logger.error if error?
      write()

destroyFile = (path, callback) ->
  fs.unlink path, (error) ->
    return logger.error "#{error}" if error?
    logger.info "destroy #{path}"
    callback error

generateOrDestroy = (generate, options, callback) ->
  {rootPath, type, name, config, parentDir} = options
  generateOrDestroyFile = if generate then generateFile else destroyFile
  appPath = sysPath.join rootPath, 'app'
  testPath = sysPath.join rootPath, 'test', 'unit'

  languageType = switch type
    when 'collection', 'model', 'router', 'view' then 'javascript'
    when 'style' then 'stylesheet'
    else type

  configSection = config.files[helpers.pluralize languageType]

  extension = configSection?.defaultExtension ? switch languageType
    when 'javascript' then 'coffee'
    when 'stylesheet' then 'styl'
    when 'template' then 'eco'
    else ''

  name += "_#{type}" if type in ['router', 'view']
  parentDir ?= if languageType is 'template'
    sysPath.join 'views', "#{helpers.pluralize type}"
  else
    "#{helpers.pluralize type}"

  logger.log 'debug', "Initializing file of type '#{languageType}' with 
extension '#{extension}'"

  initFile = (parentDir, callback) ->
    fullPath = sysPath.join appPath, parentDir, "#{name}.#{extension}"
    helpers.loadPlugins config, (error, plugins) ->
      plugin = plugins.filter((plugin) -> plugin.extension is extension)[0]
      generator = plugin?.generators?[config.framework or 'backbone']?[type]
      data = if generator?
        if typeof generator is 'function'
          generator name
        else
          generator
      else
        ''
      if generate
        generateFile fullPath, data, callback
      else
        destroyFile fullPath, callback

  # We'll additionally generate tests for 'script' languages.
  initTests = (parentDir, callback) ->
    return callback() unless languageType is 'javascript'
    fullPath = sysPath.join testPath, parentDir, "#{name}.#{extension}"
    if generate
      generateFile fullPath, '', callback
    else
      destroyFile fullPath, callback

  initFile parentDir, ->
    initTests parentDir, ->
      callback()

install = (rootPath, callback = (->)) ->
  prevDir = process.cwd()
  process.chdir rootPath
  logger.info 'Installing packages...'
  exec 'npm install', (error, stdout, stderr) ->
    process.chdir prevDir
    callback stderr, stdout

# Create new application in `rootPath` and build it.
# App is created by copying directory `../template/base` to `rootPath`.
exports.new = (options, callback = (->)) ->
  {rootPath, buildPath, template} = options
  buildPath ?= sysPath.join rootPath, 'build'
  template ?= sysPath.join __dirname, '..', 'template', 'base'
  sysPath.exists rootPath, (exists) ->
    if exists
      return logger.error "Directory '#{rootPath}' already exists"
    mkdirp rootPath, (parseInt 755, 8), (error) ->
      return logger.error error if error?
      ncp template, rootPath, (error) ->
        return logger.error error if error?
        logger.info 'Created brunch directory layout'
        install rootPath, callback

# Build application once and execute callback.
exports.build = (rootPath, config, callback = (->)) ->
  watchApplication no, rootPath, config, callback

# Watch application for changes and execute callback on every compilation.
exports.watch = (rootPath, config, callback = (->)) ->
  watchApplication yes, rootPath, config, callback

# Generate new controller / model / view and its tests.
# 
# rootPath - path to application directory.
# type - one of: collection, model, router, style, template, view.
# name - filename.
# config - parsed app config.
# 
exports.generate = (options, callback = (->)) ->
  generateOrDestroy yes, options, callback

exports.destroy = (options, callback = (->)) ->
  generateOrDestroy no, options, callback
