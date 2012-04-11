fs = require 'fs'
mkdirp = require 'mkdirp'
sysPath = require 'path'
helpers = require '../helpers'
logger = require '../logger'
fs_utils = require '../fs_utils'

generateFile = (path, data, callback) ->
  parentDir = sysPath.dirname path
  write = ->
    logger.info "create #{path}"
    fs.writeFile path, data, callback
  fs_utils.exists parentDir, (exists) ->
    return write() if exists
    logger.info "create #{parentDir}"
    mkdirp parentDir, 0o755, (error) ->
      return logger.error if error?
      write()

destroyFile = (path, callback) ->
  fs.unlink path, (error) ->
    return logger.error "#{error}" if error?
    logger.info "destroy #{path}"
    callback error

module.exports = scaffold = (rollback, options, callback = (->)) ->
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

  logger.debug "Initializing file of type '#{languageType}' with 
extension '#{extension}'"

  initFile = (parentDir, callback) ->
    fullPath = sysPath.join config.paths.app, parentDir, "#{name}.#{extension}"
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
    unitTestPath = sysPath.join config.paths.test, 'unit'
    fullPath = sysPath.join unitTestPath, parentDir, "#{name}.#{extension}"
    data = ''
    generateOrDestroyFile fullPath, data, callback

  initFile parentDir, ->
    initTests parentDir, ->
      callback()
