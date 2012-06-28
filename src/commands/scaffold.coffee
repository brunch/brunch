'use strict'

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
    'model-test': 'javascripts'
    model: 'javascripts'
    'collection-test': 'javascripts'
    collection: 'javascripts'
    template: 'templates'
    style: 'stylesheets'
    'view-test': 'javascripts'
    view: 'javascripts'
    scaffold: 'javascripts'

  chaplin:
    'controller-test': 'javascripts'
    controller: 'javascripts'
    'model-test': 'javascripts'
    model: 'javascripts'
    'collection-test': 'javascripts'
    collection: 'javascripts'
    template: 'templates'
    style: 'stylesheets'
    'view-test': 'javascripts'
    view: 'javascripts'
    'collection-view-test': 'javascripts'
    'collection-view': 'javascripts'
    'page-view-test': 'javascripts'
    'page-view': 'javascripts'
    scaffold: 'javascripts'

frameworkChocies = ->
  Object.keys(categories).join(', ')

generatorChoices = (framework) ->
  Object.keys(categories[framework] or {}).join(', ')

generators = (config, generator) ->
  backbone:
    'model-test': (name, pluralName) ->
      [sysPath.join(config.paths.test, 'models', "#{name}_test")]

    model: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'models', "#{name}")].concat(
        generator('model-test', name, pluralName)
      )

    'collection-test': (name, pluralName) ->
      [sysPath.join(config.paths.test, 'models', "#{pluralName}_test")]

    collection: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'models', "#{pluralName}")].concat(
        generator('collection-test', name, pluralName)
      )

    template: (name) ->
      [sysPath.join(config.paths.app, 'views', 'templates', "#{name}")]

    style: (name) ->
      [sysPath.join(config.paths.app, 'views', 'styles', "#{name}")]

    'view-test': (name, pluralName) ->
      [sysPath.join(config.paths.test, 'views', "#{name}_view_test")]

    view: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'views', "#{name}_view")].concat(
        generator('view-test', name, pluralName),
        generator('template', name),
        generator('style', name)
      )

    scaffold: (name, pluralName) ->
      generator('model', name, pluralName).concat(
        generator('view', name, pluralName),
      )

  chaplin:
    'controller-test': (name, pluralName) ->
      [sysPath.join(
        config.paths.test, 'controllers', "#{pluralName}_controller_test"
      )]

    controller: (name, pluralName) ->
      [sysPath.join(
        config.paths.app, 'controllers', "#{pluralName}_controller"
      )].concat(generator('controller-test', name, pluralName))

    'model-test': (name, pluralName) ->
      [sysPath.join(config.paths.test, 'models', "#{name}_test")]

    model: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'models', "#{name}")].concat(
        generator('model-test', name, pluralName)
      )

    'collection-test': (name, pluralName) ->
      [sysPath.join(config.paths.test, 'models', "#{pluralName}_test")]

    collection: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'models', "#{pluralName}")].concat(
        generator('collection-test', name, pluralName)
      )

    template: (name) ->
      [sysPath.join(config.paths.app, 'views', 'templates', "#{name}")]

    style: (name) ->
      [sysPath.join(config.paths.app, 'views', 'styles', "#{name}")]

    'view-test': (name, pluralName) ->
      [sysPath.join(config.paths.test, 'views', "#{name}_view_test")]

    view: (name, pluralName) ->
      [sysPath.join(config.paths.app, 'views', "#{name}_view")].concat(
        generator('view-test', name, pluralName),
        generator('template', name)
      )

    'collection-view-test': (name, pluralName) ->
      [sysPath.join(config.paths.test, 'views', "#{pluralName}_view_test")]

    'collection-view': (name, pluralName) ->
      [sysPath.join(config.paths.app, 'views', "#{pluralName}_view")].concat(
        generator('collection-view-test', name, pluralName)
      )

    'page-view-test': (name, pluralName) ->
      [sysPath.join(config.paths.test, 'views', "#{name}_page_view_test")]

    'page-view': (name, pluralName) ->
      [sysPath.join(config.paths.app, 'views', "#{name}_page_view")].concat(
        generator('page-view-test', name, pluralName),
        generator('template', "#{name}_page"),
        generator('style', "#{name}_page"),
      )

    scaffold: (name, pluralName) ->
      generator('controller', name, pluralName).concat(
        generator('model', name, pluralName),
        generator('view', name, pluralName),
        generator('collection-view', name, pluralName)
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
        logger.debug 'info', "Scaffolding", file
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
  pluralName = if type in ['controller', 'collection']
    name
  else
    inflection.pluralize name, pluralName
  if name is pluralName
    if type in ['controller', 'collection', 'scaffold']
      name = inflection.singularize pluralName
    else
      return logger.error "Plural form must be declared for '#{name}'"

  generateOrDestroyFile = (file, callback) ->
    if rollback
      destroyFile file.path, callback
    else
      generateFile file.path, file.data, callback

  helpers.loadPackages '.', (error, packages) ->
    return logger.error error if error?
    config = helpers.loadConfig configPath
    return callback() unless config?
    plugins = helpers.getPlugins packages, config

    generator = getGenerator config, plugins
    files = generator type, name, pluralName
    async.forEach files, generateOrDestroyFile, (error) ->
      return logger.error error if error?
      callback null, files
