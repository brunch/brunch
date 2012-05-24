{EventEmitter} = require 'events'
Asset = require './asset'
SourceFile = require './source_file'
helpers = require '../helpers'
logger = require '../logger'

# A list of `fs_utils.SourceFile` with some additional methods
# used to simplify file reading / removing.
module.exports = class FileList extends EventEmitter
  # Maximum time between changes of two files that will be considered
  # as a one compilation.
  RESET_TIME: 65

  constructor: (@config) ->
    @files = []
    @assets = []
    @on 'change', @_change
    @on 'unlink', @_unlink

  # Files that are not really app files.
  _ignored: (path, test = @config.paths.ignored) ->
    switch toString.call(test)
      when '[object RegExp]'
        path.match test
      when '[object Function]'
        test path
      when '[object String]'
        path is test
      when '[object Array]'
        test.some((subTest) => @_ignored path, subTest)
      else
        no

  _isAsset: (path) ->
    @config.paths.assets.some((dir) -> helpers.startsWith(path, dir))

  # Called every time any file was changed.
  # Emits `ready` event after `RESET_TIME`.
  _resetTimer: =>
    clearTimeout @timer if @timer?
    @timer = setTimeout (=> @emit 'ready'), @RESET_TIME

  _getByPath: (path) ->
    @files.filter((file) -> file.path is path)[0]

  _getAssetByPath: (path) ->
    @assets.filter((file) -> file.path is path)[0]

  _compileDependentFiles: (path) ->
    unless @_isAsset path
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

  _copy: (asset) =>
    asset.copy (error) =>
      logger.debug "Copied asset '#{asset.path}'"
      if error?
        return logger.error "Copying of '#{asset.path}' failed -- #{error}"
      @_resetTimer()

  _add: (path, compiler, isHelper) ->
    isVendor = helpers.startsWith(path, @config.paths.vendor)
    file = new SourceFile path, compiler, isHelper, isVendor
    @files.push file
    file

  _addAsset: (path) ->
    file = new Asset path, @config
    @assets.push file
    file

  _change: (path, compiler, isHelper) =>
    return @_compileDependentFiles path if @_ignored path
    if @_isAsset path
      @_copy (@_getAssetByPath(path) ? @_addAsset path)
    else
      @_compile (@_getByPath(path) ? @_add path, compiler, isHelper)
    @_resetTimer()

  _unlink: (path) =>
    return @_compileDependentFiles path if @_ignored path
    if @_isAsset path
      @assets.splice(@assets.indexOf(pat), 1)
    else
      file = @_getByPath path
      @files.splice(@files.indexOf(file), 1)
    @_resetTimer()
