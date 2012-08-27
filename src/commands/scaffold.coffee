'use strict'

async = require 'async'
fs = require 'fs'
inflection = require 'inflection'
mkdirp = require 'mkdirp'
os = require 'os'
sysPath = require 'path'
walk = require 'walk'
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
    logger.info "init #{parentDir}"
    mkdirp parentDir, 0o755, (error) ->
      return logger.error if error?
      write()

destroyFile = (path, callback) ->
  fs.unlink path, (error) ->
    return logger.error "#{error}" if error?
    logger.info "destroy #{path}"
    callback error

scaffoldFile = (rollback, from, to, templateData, callback) ->
  if rollback
    destroyFile to, callback
  else
    fs.readFile from, (error, buffer) ->
      formatted = try
        helpers.formatTemplate buffer.toString(), templateData
      catch error
        buffer
      generateFile to, formatted, callback

scaffoldFiles = (rollback, templateData) -> (generator, callback) ->
  async.forEach generator.files, ({from, to}, callback) ->
    scaffoldFile rollback, from, to, templateData, callback
  , callback

isDirectory = (generatorsPath) -> (path, callback) ->
  fs.stat (sysPath.join generatorsPath, path), (error, stats) ->
    logger.error error if error?
    callback stats.isDirectory()

readGeneratorConfig = (generatorsPath) -> (name, callback) ->
  path = sysPath.join generatorsPath, name, 'generator.json'
  fs.readFile path, (error, buffer) ->
    return callback error if error?
    data = buffer.toString()
    try
      json = JSON.parse data
    catch error
      throw new Error "Invalid json at #{path}: #{error}"
    json.name = name
    callback null, json

formatGeneratorConfig = (path, json, templateData) ->
  join = (file) -> sysPath.join path, file
  replaceSlashes = (string) ->
    if os.platform() is 'win32'
      string.replace(/\//g, '\\')
    else
      string

  json.files = json.files.map (object) ->
    {
      from: join replaceSlashes object.from
      to: replaceSlashes helpers.formatTemplate object.to, templateData
    }
  json.dependencies = json.dependencies.map (object) ->
    {
      name: object.name
      params: helpers.formatTemplate object.params, templateData
    }
  Object.freeze json

getDependencyTree = (generators, generatorName, memo = []) ->
  generator = generators.filter((gen) -> gen.name is generatorName)[0]
  throw new Error "Invalid generator #{generatorName}" unless generator?
  (generator.dependencies ? []).forEach (dependency) ->
    getDependencyTree generators, dependency.name, memo
  memo.push generator
  memo

generateFiles = (rollback, generatorsPath, type, templateData, callback) ->
  fs.readdir generatorsPath, (error, files) ->
    return throw new Error error if error?
    async.filter files, isDirectory(generatorsPath), (directories) ->
      async.map directories, readGeneratorConfig(generatorsPath), (error, configs) ->
        return throw new Error error if error?
        generators = directories.map (directory, index) ->
          path = sysPath.join generatorsPath, directory
          formatGeneratorConfig path, configs[index], templateData
        tree = getDependencyTree generators, type
        async.forEach tree, scaffoldFiles(rollback, templateData), (error) ->
          return callback error if error?
          callback()

module.exports = scaffold = (rollback, options, callback = (->)) ->
  {type, name, pluralName, parentDir, configPath} = options
  pluralName = inflection.pluralize name

  helpers.loadPackages helpers.pwd(), (error, packages) ->
    return logger.error error if error?
    config = helpers.loadConfig configPath
    return callback() unless config?

    generators = config.paths.generators
    templateData = {name, pluralName}

    generateFiles rollback, generators, type, templateData, (error) ->
      return logger.error error if error?
      callback()
