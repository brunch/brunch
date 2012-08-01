'use strict'

async = require 'async'
fs = require 'fs'
inflection = require 'inflection'
mkdirp = require 'mkdirp'
sysPath = require 'path'
walk = require 'walk'
helpers = require '../helpers'
logger = require '../logger'
fs_utils = require '../fs_utils'

readGeneratorConfig = (generatorsPath) -> (generatorPath, callback) ->
  fs.readFile (sysPath.join generatorsPath, generatorPath, 'generator.json'), (error, data) ->
    return callback error if error?
    json = JSON.parse data.toString()
    json.name = generatorPath
    callback null, json

formatGeneratorConfig = (path, json, templateData) ->
  join = (file) -> sysPath.join path, file
  replaceSlashes = (string) ->
    if process.platform is 'win32'
      string.replace(/\//g, '\\')
    else
      string

  json.files = json.files.map (object) ->
    replacedTo = replaceSlashes object.to
    copy = {}
    copy.from = join replaceSlashes object.from
    copy.to = helpers.formatTemplate replacedTo, templateData
    copy

  Object.freeze json

getDependencyTree = (generators, generatorName, memo = []) ->
  predicate = (generator) -> generator.name is generatorName
  generator = generators.filter(predicate)[0]
  (generator.dependencies ? []).forEach (dependency) ->
    getDependencyTree generators, dependency, memo
  memo.push generator
  memo

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

scaffoldFile = (from, to, rollback, templateData, callback) ->
  if rollback
    destroyFile to, callback
  else
    fs.readFile from, (error, buffer) ->
      formatted = helpers.formatTemplate buffer.toString(), templateData
      generateFile to, formatted, callback

scaffoldFiles = (rollback, templateData) -> (generator, callback) ->
  async.forEach generator.files, ({from, to}, callback) ->
    scaffoldFile from, to, rollback, templateData, callback
  , callback

generateFiles = (rollback, generatorsPath, type, templateData, callback) ->
  fs.readdir generatorsPath, (error, directories) ->
    return callback error if error?
    async.map directories, readGeneratorConfig(generatorsPath), (error, configs) ->
      generators = directories.map (directory, index) ->
        path = sysPath.join generatorsPath, directory
        formatGeneratorConfig path, configs[index], templateData
      tree = getDependencyTree generators, type
      # logger.error "#{generator} is invalid generator name. Valid names:  #{generators.join ' '}"
      async.forEach tree, scaffoldFiles(rollback, templateData), (error) ->
        return callback error if error?
        callback()

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

  helpers.loadPackages '.', (error, packages) ->
    return logger.error error if error?
    config = helpers.loadConfig configPath
    return callback() unless config?

    generators = config.paths.generators
    templateData = {name, pluralName}

    generateFiles rollback, generators, type, templateData, (error) ->
      return logger.error error if error?
      callback()
