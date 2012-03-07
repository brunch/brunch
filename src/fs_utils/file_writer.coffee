async = require 'async'
{EventEmitter} = require 'events'
sysPath = require 'path'
common = require './common'
{GeneratedFile} = require './generated_file'
logger = require '../logger'

class exports.FileWriter extends EventEmitter
  constructor: (@config, @plugins) ->
    @destFiles = []
    @_initFilesConfig @config.files

  _initFilesConfig: (filesConfig) ->
    config = filesConfig
    Object.keys(config).forEach (type) =>
      data = config[type]
      if typeof data.joinTo is 'string'
        object = {}
        object[data.joinTo] = /.+/
        data.joinTo = object
      Object.keys(data.joinTo).forEach (destinationPath) =>
        regExpOrFunction = data.joinTo[destinationPath]
        data.joinTo[destinationPath] = if regExpOrFunction instanceof RegExp
          (string) ->
            regExpOrFunction.test string
        else
          regExpOrFunction
    config

  _getDestinationPathes: (file) ->
    pathes = []
    data = @config.files[common.pluralize file.type]
    for own destinationPath, tester of data.joinTo when tester file.path
      pathes.push destinationPath
    if pathes.length > 0 then pathes else null

  _getFiles: (fileList, minifiers) ->
    map = {}
    fileList.files.forEach (file) =>
      pathes = @_getDestinationPathes file
      return unless pathes?
      pathes.forEach (path) =>
        map[path] ?= []
        map[path].push file
    files = []
    for generatedFilePath, sourceFiles of map
      generatedFilePath = sysPath.join @config.buildPath, generatedFilePath
      file = new GeneratedFile generatedFilePath, sourceFiles, @config
      for minifier in minifiers when minifier.minifierType is file.type
        file.minifier = minifier
      files.push file
    files

  write: (fileList) =>
    files = @_getFiles fileList, @plugins.filter (plugin) -> !!plugin.minify
    write = (file, callback) -> file.write callback
    async.forEach files, write, (error, results) =>
      return logger.error "write error. #{error}" if error?
      @emit 'write', results
