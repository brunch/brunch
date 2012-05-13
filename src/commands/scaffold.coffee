async = require 'async'
fs = require 'fs'
mkdirp = require 'mkdirp'
sysPath = require 'path'
helpers = require '../helpers'
logger = require '../logger'
fs_utils = require '../fs_utils'

flatten = (array) ->
  array.reduce (acc, elem) ->
    acc.concat(if Array.isArray(elem) then flatten(elem) else [elem])
  , []

categories =
  backbone:
    modelTest: 'javascripts'
    model: 'javascripts'
    collectionTest: 'javascripts'
    collection: 'javascripts'
    template: 'templates'
    style: 'stylesheets'
    viewTest: 'javascripts'
    view: 'javascripts'
    scaffold: 'javascripts'

  chaplin:
    controllerTest: 'javascripts'
    controller: 'javascripts'
    modelTest: 'javascripts'
    model: 'javascripts'
    collectionTest: 'javascripts'
    collection: 'javascripts'
    template: 'templates'
    style: 'stylesheets'
    viewTest: 'javascripts'
    view: 'javascripts'
    scaffold: 'javascripts'

frameworkChocies = ->
  Object.keys(categories).join(', ')

generatorChoices = (framework) ->
  Object.keys(categories[framework] or {}).join(', ')

generators = (config, generator) ->
  backbone:
    modelTest: (name) ->
      [sysPath.join(config.paths.test, 'models', "#{name}_test")]

    model: (name) ->
      [sysPath.join(config.paths.app, 'models', "#{name}")].concat(
        generator('modelTest', name)
      )

    collectionTest: (name) ->
      [sysPath.join(config.paths.test, 'models', "#{helpers.pluralize name}_test")]

    collection: (name) ->
      [sysPath.join(config.paths.app, 'models', "#{helpers.pluralize name}")].concat(
        generator('collectionTest', name)
      )

    template: (name) ->
      [sysPath.join(config.paths.app, 'views', 'templates', "#{name}")]

    style: (name) ->
      [sysPath.join(config.paths.app, 'views', 'styles', "#{name}")]

    viewTest: (name) ->
      [sysPath.join(config.paths.test, 'views', "#{name}_view_test")]

    view: (name) ->
      [sysPath.join(config.paths.app, 'views', "#{name}_view")].concat(
        generator('viewTest', name),
        generator('template', name),
        generator('style', name)
      )

    scaffold: (name) ->
      generator('model', name).concat(
        generator('collection', name),
        generator('view', name)
      )

  chaplin:
    # What generates what:
    # controller: controller, controllerTest
    # model: model, modelTest
    # view: view, viewTest, style, template
    # scaffold: controller, model, view
    controllerTest: (name) ->
      [sysPath.join(
        config.paths.test, 'controllers', "#{name}_controller_test"
      )]

    controller: (name) ->
      [sysPath.join(
        config.paths.app, 'controllers', "#{name}_controller"
      )].concat(generator('controllerTest', name))

    modelTest: (name) ->
      [sysPath.join(config.paths.test, 'models', "#{name}_test")]

    model: (name) ->
      [sysPath.join(config.paths.app, 'models', "#{name}")].concat(
        generator('modelTest', name)
      )

    collectionTest: (name) ->
      [sysPath.join(config.paths.test, 'models', "#{helpers.pluralize name}_test")]

    collection: (name) ->
      [sysPath.join(config.paths.app, 'models', "#{helpers.pluralize name}")].concat(
        generator('collectionTest', name)
      )

    template: (name) ->
      [sysPath.join(config.paths.app, 'views', 'templates', "#{name}")]

    style: (name) ->
      [sysPath.join(config.paths.app, 'views', 'styles', "#{name}")]

    viewTest: (name) ->
      [sysPath.join(config.paths.test, 'views', "#{name}_view_test")]

    view: (name) ->
      [sysPath.join(config.paths.app, 'views', "#{name}_view")].concat(
        generator('viewTest', name),
        generator('template', name),
        generator('style', name)
      )

    scaffold: (name) ->
      generator('controller', name).concat(
        generator('model', name),
        generator('collection', name),
        generator('view', name)
      )

getGenerator = (config, plugins) ->
  framework = config.framework or 'backbone'

  unless categories[framework]?
    return logger.error "Framework #{framework} isn't supported. Use one of: 
#{frameworkChocies()}"

  getExtension = (type) ->
    category = categories[framework]?[type]
    if category?
      config.files[category]?.defaultExtension ? ''
    else
      logger.error "Generator #{type} isn't supported. Use one of: 
#{generatorChoices(framework)}."
      ''

  generatorMap = null
  getGeneratorMap = ->
    generatorMap ?= generators config, generator

  generator = (type, name) ->
    configGenerator = config.generators?[type]
    getData = (item) ->
      if typeof item is 'function'
        item name, type
      else
        item

    extension = getExtension type
    plugin = plugins.filter((plugin) -> plugin.extension is extension)[0]
    dataGenerator = plugin?.generators?[framework]?[type]

    data = if configGenerator?
      getData configGenerator
    else if dataGenerator?
      getData dataGenerator
    else
      ''

    getPaths = getGeneratorMap()[framework]?[type]
    paths = (getPaths? name) or []
    nonStrings = paths.filter (path) -> typeof path isnt 'string'
    strings = paths
      .filter (path) ->
        typeof path is 'string'
      .map (path) ->
        path + ".#{extension}"
      .map (path) ->
        file = {type, extension, path, data}
        logger.debug "Generating", file
        file
    strings.concat(nonStrings)

  generator

generateFile = (path, data, callback) ->
  parentDir = sysPath.dirname path
  write = ->
    logger.info "create #{path}"
    fs.writeFile path, data, callback
  fs_utils.exists parentDir, (exists) ->
    return write() if exists
    logger.info "init #{parentDir}"
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

  generateOrDestroyFile = (file, callback) ->
    if rollback
      destroyFile file.path, callback
    else
      generateFile file.path, file.data, callback

  helpers.loadPlugins config, (error, plugins) ->
    return logger.error error if error?
    generator = getGenerator config, plugins
    files = generator type, name
    async.forEach files, generateOrDestroyFile, (error) ->
      return logger.error error if error?
      callback null, files
