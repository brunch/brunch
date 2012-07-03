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

flatten = (array) ->
  array.reduce (acc, elem) ->
    acc.concat(if Array.isArray(elem) then flatten(elem) else [elem])
  , []

formatTemplate = (template) ->
  template

# 
#
# generatorsPath - String, 
# callback       - Function, 
#
# Example:
#
#   getAllGenerators './generators', ->
#   # => {
#     controller: {parent: 'app/controllers', template: '', extension: ''}
#   }
#
# Returns an Object of Object-s.
getAllGenerators = (generatorsPath, callback) ->
  err = null
  generators = Object.create(null)
  walker = walk.walk generatorsPath
  walker.on 'file', (root, stats, next) ->
    path = sysPath.join root, stats.name
    return next() if fs_utils.ignored path
    type = sysPath.basename(path).replace(/\.\w*$/, '')
    generators[type] = generator = Object.create(null)
    generator.type = type
    generator.parent = sysPath.relative generatorsPath, root
    generator.extension = sysPath.extname path
    fs.readFile path, (error, data) ->
      if error?
        err = error
        return next()
      generator.template = data.toString()
      next()
  walker.on 'end', ->
    callback err, generators

getGenerator = (generators, name, pluralName) -> (type, parent) ->
  generator = generators[type]
  unless generator?
    throw new Error "Generator #{type} isn't supported. Use one of: 
#{Object.keys(generators).join(', ')}"
  generator.parent = parent if parent?
  generator.name = name
  generator.pluralName = pluralName
  Object.freeze generator

getFilesFromGenerators = (generators) ->
  console.log generators
  generators.map (generator) ->
    path = sysPath.join(generator.parent, generator.name) + generator.extension
    data = formatTemplate generator.template
    {path, data}

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
    
    relatedTypes = config.generatorsRelations?[type] ? []

    getAllGenerators config.paths.generators, (error, allGenerators) ->
      return logger.error error if error?
      getGen = getGenerator allGenerators, name, pluralName
      generators = if parentDir?
        [getGen type, parent]
      else
        ([type].concat relatedTypes).map (type) -> getGen type
      files = getFilesFromGenerators generators
      async.forEach files, generateOrDestroyFile, (error) ->
        return logger.error error if error?
        callback null, files
