async = require 'async'
{exec, spawn} = require 'child_process'
fs = require 'fs'
mkdirp = require 'mkdirp'
rimraf = require 'rimraf'
sysPath = require 'path'
helpers = require './helpers'
logger = require './logger'
fs_utils = require './fs_utils'

install = (rootPath, callback = (->)) ->
  prevDir = process.cwd()
  logger.info 'Installing packages...'
  process.chdir rootPath
  # Install node packages.
  exec 'npm install', (error, stdout, stderr) ->
    process.chdir prevDir
    return callback stderr.toString() if error?
    callback null, stdout

# Remove git metadata and run npm install.
removeAndInstall = (rootPath, callback) ->
  rimraf (sysPath.join rootPath, '.git'), (error) ->
    return logger.error error if error?
    install rootPath, callback

create = (options, callback = (->)) ->
  {rootPath, skeleton} = options

  copySkeleton = (skeletonPath) ->
    skeletonDir = sysPath.join __dirname, '..', 'skeletons'
    skeletonPath ?= sysPath.join skeletonDir, 'simple-coffee'
    logger.log 'debug', "Copying skeleton from #{skeletonPath}"

    copyDirectory = (from) ->
      fs_utils.copyIfExists from, rootPath, no, (error) ->
        return logger.error error if error?
        logger.info 'Created brunch directory layout'
        removeAndInstall rootPath, callback

    mkdirp rootPath, (parseInt 755, 8), (error) ->
      return logger.error error if error?
      fs_utils.exists skeletonPath, (exists) ->
        return logger.error "Skeleton '#{skeleton}' doesn't exist" unless exists
        copyDirectory skeletonPath

  cloneSkeleton = (URL) ->
    logger.log 'debug', "Cloning skeleton from git URL #{URL}"
    exec "git clone #{URL} #{rootPath}", (error, stdout, stderr) ->
      return logger.error "Git clone error: #{stderr.toString()}" if error?
      logger.info 'Created brunch directory layout'
      removeAndInstall rootPath, callback

  fs_utils.exists rootPath, (exists) ->
    return logger.error "Directory '#{rootPath}' already exists" if exists
    if /(https?|git)(:\/\/|@)/.test skeleton
      cloneSkeleton skeleton, callback
    else
      copySkeleton skeleton, callback

isCompilerFor = (path, plugin) ->
  pattern = if plugin.pattern
    plugin.pattern
  else if plugin.extension
    ///\.#{plugin.extension}$///
  else
    null
  (typeof plugin.compile is 'function') and !!(pattern?.test path)

watch = (persistent, options, callback = (->)) ->
  config = helpers.loadConfig options.configPath
  return callback() unless config?

  if persistent
    config.server.run = yes if options.server
    config.server.port = options.port if options.port

  {rootPath} = config

  ignored = (path) ->
    helpers.startsWith(path, config.pathes.assets) or
    helpers.startsWith(sysPath.basename(path), '_')

  helpers.startServer config if persistent and config.server.run
  directories = ['app', 'vendor'].map sysPath.join.bind(null, rootPath)

  fileList = new fs_utils.SourceFileList

  helpers.loadPlugins config, (error, plugins) ->
    return logger.error error if error?
    start = null
    addToFileList = (isPluginHelper, path) ->
      start = Date.now()
      logger.log 'debug', "File '#{path}' was changed"
      return fileList.resetTimer() if ignored path
      compiler = plugins.filter(isCompilerFor.bind(null, path))[0]
      return unless compiler
      fileList.add {path, compiler, isPluginHelper}

    removeFromFileList = (path) ->
      return fileList.resetTimer() if ignored path
      logger.log 'debug', "File '#{path}' was removed"
      fileList.remove path

    plugins.forEach (plugin) ->
      return unless plugin.include?
      includePathes = if typeof plugin.include is 'function'
        plugin.include()
      else
        plugin.include
      includePathes.forEach addToFileList.bind(null, yes)

    writer = new fs_utils.FileWriter config, plugins
    watcher = (new fs_utils.FileWatcher)
      .add(directories)
      .on('change', addToFileList.bind(null, no))
      .on('remove', removeFromFileList)
    fileList.on 'resetTimer', -> writer.write fileList

    writer.on 'write', (result) ->
      copyIfExists = fs_utils.copyIfExists
      copyIfExists config.pathes.assets, config.pathes.build, yes, (error) ->
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
  fs_utils.exists parentDir, (exists) ->
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

scaffold = (rollback, options, callback = (->)) ->
  {type, name, parentDir, configPath} = options
  config = helpers.loadConfig configPath
  return callback() unless config?

  generateOrDestroyFile = if rollback
    (fullPath, data, callback) -> destroyFile fullPath, callback
  else
    generateFile

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
    fullPath = sysPath.join config.pathes.app, parentDir, "#{name}.#{extension}"
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
      generateOrDestroyFile fullPath, data, callback

  # We'll additionally generate tests for 'script' languages.
  initTests = (parentDir, callback) ->
    return callback() unless languageType is 'javascript'
    unitTestPath = sysPath.join config.pathes.test, 'unit'
    fullPath = sysPath.join unitTestPath, parentDir, "#{name}.#{extension}"
    data = ''
    generateOrDestroyFile fullPath, data, callback

  initFile parentDir, ->
    initTests parentDir, ->
      callback()

exports.new = create
exports.build = watch.bind(null, no)
exports.watch = watch.bind(null, yes)
exports.generate = scaffold.bind(null, no)
exports.destroy = scaffold.bind(null, yes)
