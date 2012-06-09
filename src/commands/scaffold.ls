async = require 'async'
fs = require 'fs'
inflection = require 'inflection'
mkdirp = require 'mkdirp'
sys-path = require 'path'
helpers = require '../helpers'
logger = require '../logger'
fs_utils = require '../fs_utils'

flatten = (array) ->
  array.reduce (acc, elem) ->
    acc.concat(if Array.is-array(elem) then flatten(elem) else [elem])
  , []

categories =
  backbone:
    model-test: 'javascripts'
    model: 'javascripts'
    collection-test: 'javascripts'
    collection: 'javascripts'
    template: 'templates'
    style: 'stylesheets'
    view-test: 'javascripts'
    view: 'javascripts'
    scaffold: 'javascripts'

  chaplin:
    controller-test: 'javascripts'
    controller: 'javascripts'
    model-test: 'javascripts'
    model: 'javascripts'
    collection-test: 'javascripts'
    collection: 'javascripts'
    template: 'templates'
    style: 'stylesheets'
    view-test: 'javascripts'
    view: 'javascripts'
    collection-view-test: 'javascripts'
    collection-view: 'javascripts'
    scaffold: 'javascripts'

framework-chocies = ->
  Object.keys(categories).join(', ')

generator-choices = (framework) ->
  Object.keys(categories[framework] or {}).join(', ')

generators = (config, generator) ->
  backbone:
    model-test: (name, plural-name) ->
      [sys-path.join(config.paths.test, 'models', "#{name}_test")]

    model: (name, plural-name) ->
      [sys-path.join(config.paths.app, 'models', "#{name}")].concat(
        generator('model-test', name, plural-name)
      )

    collection-test: (name, plural-name) ->
      [sys-path.join(config.paths.test, 'models', "#{plural-name}_test")]

    collection: (name, plural-name) ->
      [sys-path.join(config.paths.app, 'models', "#{plural-name}")].concat(
        generator('collection-test', name, plural-name)
      )

    template: (name) ->
      [sys-path.join(config.paths.app, 'views', 'templates', "#{name}")]

    style: (name) ->
      [sys-path.join(config.paths.app, 'views', 'styles', "#{name}")]

    view-test: (name, plural-name) ->
      [sys-path.join(config.paths.test, 'views', "#{name}_view_test")]

    view: (name, plural-name) ->
      [sys-path.join(config.paths.app, 'views', "#{name}_view")].concat(
        generator('view-test', name, plural-name),
        generator('template', name),
        generator('style', name)
      )

    scaffold: (name, plural-name) ->
      generator('model', name, plural-name).concat(
        generator('view', name, plural-name),
      )

  chaplin:
    controller-test: (name, plural-name) ->
      [sys-path.join(
        config.paths.test, 'controllers', "#{plural-name}_controller_test"
      )]

    controller: (name, plural-name) ->
      [sys-path.join(
        config.paths.app, 'controllers', "#{plural-name}_controller"
      )].concat(generator('controller-test', name, plural-name))

    model-test: (name, plural-name) ->
      [sys-path.join(config.paths.test, 'models', "#{name}_test")]

    model: (name, plural-name) ->
      [sys-path.join(config.paths.app, 'models', "#{name}")].concat(
        generator('model-test', name, plural-name)
      )

    collection-test: (name, plural-name) ->
      [sys-path.join(config.paths.test, 'models', "#{plural-name}_test")]

    collection: (name, plural-name) ->
      [sys-path.join(config.paths.app, 'models', "#{plural-name}")].concat(
        generator('collection-test', name, plural-name)
      )

    template: (name) ->
      [sys-path.join(config.paths.app, 'views', 'templates', "#{name}")]

    style: (name) ->
      [sys-path.join(config.paths.app, 'views', 'styles', "#{name}")]

    view-test: (name, plural-name) ->
      [sys-path.join(config.paths.test, 'views', "#{name}_view_test")]

    view: (name, plural-name) ->
      [sys-path.join(config.paths.app, 'views', "#{name}_view")].concat(
        generator('view-test', name, plural-name),
        generator('template', name)
      )

    collection-view-test: (name, plural-name) ->
      [sys-path.join(config.paths.test, 'views', "#{plural-name}_view_test")]

    collection-view: (name, plural-name) ->
      [sys-path.join(config.paths.app, 'views', "#{plural-name}_view")].concat(
        generator('collection-view-test', name, plural-name)
      )

    page-view-test: (name, plural-name) ->
      [sys-path.join(config.paths.app, 'views', "#{name}_form_view")].concat(
        generator('form-view-test', name, plural-name)
      )
    page-view: (name, plural-name) ->
      [sys-path.join(config.paths.app, 'views', "#{name}_form_view")].concat(
        generator('form-view-test', name, plural-name)
      )

    form-view-test: (name, plural-name) ->
      [sys-path.join(config.paths.test, 'views', "#{plural-name}_form_view_test")]

    form-view: (name, plural-name) ->
      [sys-path.join(config.paths.app, 'views', "#{name}_form_view")].concat(
        generator('form-view-test', name, plural-name)
      )
  
    scaffold: (name, plural-name) ->
      generator('controller', name, plural-name).concat(
        generator('model', name, plural-name),
        generator('view', name, plural-name),
        generator('collection-view', name, plural-name)
      )

get-generator = (config, plugins) ->
  framework = config.framework or 'backbone'

  unless categories[framework]?
    return logger.error "Framework #{framework} isn't supported. Use one of: 
#{framework-chocies()}"

  get-extension = (type) ->
    category = categories[framework]?[type]
    if category?
      config.files[category]?.default-extension ? ''
    else
      logger.error "Generator #{type} isn't supported. Use one of: 
#{generator-choices(framework)}."
      ''

  generator-map = null
  get-generator-map = ->
    generator-map ?= generators config, generator

  generator = (type, name, plural-name) ->
    config-generator = config.generators?[type]
    get-data = (item) ->
      if typeof item is 'function'
        item name, plural-name
      else
        item

    extension = get-extension type
    plugin = plugins.filter((plugin) -> plugin.extension is extension)[0]
    data-generator = plugin?.generators?[framework]?[type]

    data = if config-generator?
      get-data config-generator
    else if data-generator?
      get-data data-generator
    else
      ''

    get-paths = get-generator-map()[framework]?[type]
    paths = (get-paths? name, plural-name) or []
    non-strings = paths.filter (path) -> typeof path isnt 'string'
    strings = paths
      .filter (path) ->
        typeof path is 'string'
      .map (path) ->
        path + ".#{extension}"
      .map (path) ->
        file = {type, extension, path, data}
        logger.debug "Scaffolding", file
        file
    strings.concat(non-strings)

  generator

generate-file = (path, data, callback) ->
  parent-dir = sys-path.dirname path
  write = ->
    logger.info "create #{path}"
    fs.write-file path, data, callback
  fs_utils.exists parent-dir, (exists) ->
    return write() if exists
    logger.info "init #{parent-dir}"
    mkdirp parent-dir, 0o755, (error) ->
      return logger.error if error?
      write()

destroy-file = (path, callback) ->
  fs.unlink path, (error) ->
    return logger.error "#{error}" if error?
    logger.info "destroy #{path}"
    callback error

module.exports = scaffold = (rollback, options, callback = (->)) ->
  {type, name, plural-name, parent-dir, config-path} = options
  plural-name = if type in ['controller', 'collection']
    name
  else
    inflection.pluralize name, plural-name
  if name is plural-name
    if type in ['controller', 'collection', 'scaffold']
      name = inflection.singularize plural-name
    else
      return logger.error "Plural form must be declared for '#{name}'"
  config = helpers.load-config config-path
  return callback() unless config?

  generate-orDestroy-file = (file, callback) ->
    if rollback
      destroy-file file.path, callback
    else
      generate-file file.path, file.data, callback

  helpers.load-plugins config, (error, plugins) ->
    return logger.error error if error?
    generator = get-generator config, plugins
    files = generator type, name, plural-name
    async.for-each files, generate-orDestroy-file, (error) ->
      return logger.error error if error?
      callback null, files
