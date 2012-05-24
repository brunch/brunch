async = require 'async'
fs = require 'fs'
inflection = require 'inflection'
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
    collectionViewTest: 'javascripts'
    collectionView: 'javascripts'
    scaffold: 'javascripts'

frameworkChocies = ->
  Object.keys(categories).join(', ')

generatorChoices = (framework) ->
  Object.keys(categories[framework] or {}).join(', ')

generators = (config, generator) ->
  backbone:
    modelTest: (name, pluralName) ->
      [sysPath.join(config.paths.test, 'models', "#{name}_test")]

    model: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'models', "#{name}")].concat(
        generator('modelTest', name, pluralName)
      )

    collectionTest: (name, pluralName) ->
      [sysPath.join(config.paths.test, 'models', "#{pluralName}_test")]

    collection: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'models', "#{pluralName}")].concat(
        generator('collectionTest', name, pluralName)
      )

    template: (name) ->
      [sysPath.join(config.paths.app, 'views', 'templates', "#{name}")]

    style: (name) ->
      [sysPath.join(config.paths.app, 'views', 'styles', "#{name}")]

    viewTest: (name, pluralName) ->
      [sysPath.join(config.paths.test, 'views', "#{name}_view_test")]

    view: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'views', "#{name}_view")].concat(
        generator('viewTest', name, pluralName),
        generator('template', name),
        generator('style', name)
      )

    scaffold: (name, pluralName) ->
      generator('model', name, pluralName).concat(
        generator('view', name, pluralName),
      )

  chaplin:
    controllerTest: (name, pluralName) ->
      [sysPath.join(
        config.paths.test, 'controllers', "#{pluralName}_controller_test"
      )]

    controller: (name, pluralName) ->
      [sysPath.join(
        config.paths.app, 'controllers', "#{pluralName}_controller"
      )].concat(generator('controllerTest', name, pluralName))

    modelTest: (name, pluralName) ->
      [sysPath.join(config.paths.test, 'models', "#{name}_test")]

    model: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'models', "#{name}")].concat(
        generator('modelTest', name, pluralName)
      )

    collectionTest: (name, pluralName) ->
      [sysPath.join(config.paths.test, 'models', "#{pluralName}_test")]

    collection: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'models', "#{pluralName}")].concat(
        generator('collectionTest', name, pluralName)
      )

    template: (name) ->
      [sysPath.join(config.paths.app, 'views', 'templates', "#{name}")]

    style: (name) ->
      [sysPath.join(config.paths.app, 'views', 'styles', "#{name}")]

    viewTest: (name, pluralName) ->
      [sysPath.join(config.paths.test, 'views', "#{name}_view_test")]

    view: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'views', "#{name}_view")].concat(
        generator('viewTest', name, pluralName),
        generator('template', name),
        generator('style', name)
      )

    collectionViewTest: (name, pluralName) ->
      [sysPath.join(config.paths.test, 'views', "#{pluralName}_view_test")]

    collectionView: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'views', "#{pluralName}_view")].concat(
        generator('collectionViewTest', name, pluralName),
        generator('style', pluralName)
      )

    scaffold: (name, pluralName) ->
      generator('controller', name, pluralName).concat(
        generator('model', name, pluralName),
        generator('view', name, pluralName),
        generator('collectionView', name, pluralName)
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

  generator = (type, name, pluralName) ->
    configGenerator = config.generators?[type]
    getData = (item) ->
      if typeof item is 'function'
        item name, pluralName
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
    paths = (getPaths? name, pluralName) or []
    nonStrings = paths.filter (path) -> typeof path isnt 'string'
    strings = paths
      .filter (path) ->
        typeof path is 'string'
      .map (path) ->
        path + ".#{extension}"
      .map (path) ->
        file = {type, extension, path, data}
        logger.debug "Scaffolding", file
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
  {type, name, pluralName, parentDir, configPath} = options
  pluralName = inflection.pluralize name, pluralName
  if name is pluralName
    if type in ['controller', 'collection', 'scaffold']
      name = inflection.singularize pluralName
    else
      return logger.error "Plural form must be declared for '#{name}'"
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
    files = generator type, name, pluralName
    async.forEach files, generateOrDestroyFile, (error) ->
      return logger.error error if error?
      callback null, files
