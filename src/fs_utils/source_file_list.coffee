{EventEmitter} = require 'events'
sysPath = require 'path'
SourceFile = require './source_file'
helpers = require '../helpers'
logger = require '../logger'

# A list of `fs_utils.SourceFile` with some additional methods
# used to simplify file reading / removing.
module.exports = class SourceFileList extends EventEmitter
  # Maximum time between changes of two files that will be considered
  # as a one compilation.
  RESET_TIME: 100

  constructor: (@config) ->
    @files = []
    @on 'change', @_change
    @on 'unlink', @_unlink

  # Files that are not really app files.
  _ignored: (path) ->
    paths = @config.paths
    # Allow us to specify what paths are ignored in the config
    if paths.ignored
      if Array.isArray paths.ignored
        paths.ignored.some((test) -> path.match(test))
      else if typeof paths.ignored is 'function'
        paths.ignored.call(this, path)
      else
        no
    else
      # Check if path is located in any of assets directories.
      paths.assets.some((assetPath) -> helpers.startsWith path, assetPath) or
      helpers.startsWith(sysPath.basename(path), '_') or
      path in [paths.config, paths.packageConfig]

  # Called every time any file was changed.
  # Emits `ready` event after `RESET_TIME`.
  _resetTimer: =>
    clearTimeout @timer if @timer?
    @timer = setTimeout (=> @emit 'ready'), @RESET_TIME

  _getByPath: (path) ->
    @files.filter((file) -> file.path is path)[0]

  _compileDependentFiles: (path) ->
    @files
      .filter (dependent) =>
        dependent.cache.dependencies.length
      .filter (dependent) =>
        path in dependent.cache.dependencies
      .forEach(@_compile)
    @_resetTimer()

  _compile: (file) =>
    file.compile (error) =>
      logger.debug "Compiled file '#{file.path}'"
      if error?
        return logger.error "#{file.compilerName} failed in '#{file.path}' -- 
#{error}"
      @_compileDependentFiles file.path
      @_resetTimer()

  _add: (path, compiler, isHelper) ->
    isVendor = helpers.startsWith(path, @config.paths.vendor)
    file = new SourceFile path, compiler, isHelper, isVendor
    @files.push file
    file

  _change: (path, compiler, isHelper) =>
    return @_compileDependentFiles path if (@_ignored path) or not compiler
    file = @_getByPath path
    @_compile file ? @_add path, compiler, isHelper
    @_resetTimer()

  _unlink: (path) =>
    return @_compileDependentFiles path if @_ignored path
    file = @_getByPath path
    @files.splice(@files.indexOf(file), 1)
    @_resetTimer()
