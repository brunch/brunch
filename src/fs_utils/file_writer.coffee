async = require 'async'
{EventEmitter} = require 'events'
sysPath = require 'path'
helpers = require '../helpers'
{GeneratedFile} = require './generated_file'
logger = require '../logger'

# A bridge between `GeneratedFile` and `SourceFileList`.
class exports.FileWriter extends EventEmitter
  # * config  - parsed app config
  # * plugins - hashmap of plugins from package.json.
  constructor: (@config, @plugins) ->
    @destFiles = []
    @_initFilesConfig @config.files

  # config.files[type].joinTo can be :
  # a String
  # a RexExp
  # a Function
  # an Array of mixed Strings, RexExps, Functions, Objects or Arrays
  # an Object of key (path) of mixed Strings or RexExps
  # This converts all cases to one interface (str -> fn).

  _initFilesConfig: (filesConfig) ->
    config = filesConfig
    Object.keys(config).forEach (type) =>
      data = config[type]
      if typeof data.joinTo is 'string'
        object = {}
        object[data.joinTo] = /.+/
        data.joinTo = object

      Object.keys(data.joinTo).forEach (destinationPath) =>
        data.joinTo[destinationPath] = @_processOption data.joinTo[destinationPath]

    config

  _processOption: (option) ->
    if option instanceof RegExp
      @_testRegex option

    else if option instanceof Array
      @_processArrayOptions option

    else if typeof option is 'function'
      option

    else if typeof option is 'string'
      @_testRegex(new RegExp option)

    else if typeof option is 'object'
      @_processObjectOptions option

    else logger.error "#{option} is an invalid option"

  _processObjectOptions: (options) ->
    (string) =>
      for path, childs of options
        for child in childs
          if child instanceof RegExp
            concat = new RegExp path + child.source

          else if typeof child is 'string'
            concat = path + child

          else
            logger.error "#{child} is an invalid option for #{path}"

          return true if (@_processOption concat)(string)

      return false

  _processArrayOptions: (options) ->
    (string) =>
      for option in options
        return true if (@_processOption option)(string)
      return false

  _testRegex: (regex) ->
    (string) -> regex.test string

  _getDestinationPathes: (file) ->
    data = @config.files[helpers.pluralize file.type]
    pathes = (Object.keys data.joinTo).filter (destinationPath) ->
      checkingFunction = data.joinTo[destinationPath]
      checkingFunction file.path
    if pathes.length > 0 then pathes else null

  _getFiles: (fileList, minifiers) ->
    map = {}
    fileList.files.forEach (file) =>
      pathes = @_getDestinationPathes file
      return unless pathes?
      pathes.forEach (path) =>
        map[path] ?= []
        map[path].push file
    (Object.keys map).map (generatedFilePath) =>
      sourceFiles = map[generatedFilePath]
      fullPath = sysPath.join @config.buildPath, generatedFilePath
      file = new GeneratedFile fullPath, sourceFiles, @config
      minifiers
        .filter (minifier) ->
          minifier.type is file.type
        .forEach (minifier) ->
          file.minifier = minifier
      file

  write: (fileList) =>
    files = @_getFiles fileList, @plugins.filter (plugin) -> !!plugin.minify
    write = (file, callback) -> file.write callback
    async.forEach files, write, (error, results) =>
      return logger.error "write error. #{error}" if error?
      @emit 'write', results
