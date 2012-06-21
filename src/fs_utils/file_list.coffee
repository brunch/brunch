'use strict'

{EventEmitter} = require 'events'
Asset = require './asset'
SourceFile = require './source_file'
helpers = require '../helpers'
logger = require '../logger'
sysPath = require 'path'

# A list of `fs_utils.SourceFile` or `fs_utils.Asset`
# with some additional methods used to simplify file reading / removing.
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
    return yes if path in [@config.paths.config, @config.paths.packageConfig]
    
    switch toString.call(test)
      when '[object RegExp]'
        path.match test
      when '[object Function]'
        test path
      when '[object String]'
        helpers.startsWith(sysPath.normalize(path), sysPath.normalize(test))
      when '[object Array]'
        test.some((subTest) => @_ignored path, subTest)
      else
        no

  _isAsset: (path) ->
    @config.paths.assets.some((dir) -> helpers.startsWith path, dir)

  _isVendor: (path) ->
    @config.paths.vendor.some((dir) -> helpers.startsWith path, dir)

  # Called every time any file was changed.
  # Emits `ready` event after `RESET_TIME`.
  _resetTimer: =>
    clearTimeout @timer if @timer?
    @timer = setTimeout (=> @emit 'ready'), @RESET_TIME

  _findByPath: (path) ->
    @files.filter((file) -> file.path is path)[0]

  _findAssetByPath: (path) ->
    @assets.filter((file) -> file.path is path)[0]

  _compileDependentFiles: (path) ->
    @files
      .filter (dependent) =>
        dependent.cache.dependencies.length > 0
      .filter (dependent) =>
        path in dependent.cache.dependencies
      .forEach(@_compile)
    @_resetTimer()

  _compile: (file) =>
    file.compile (error) =>
      logger.debug 'info', "Compiled file '#{file.path}'"
      if error?
        return logger.error "#{file.compilerName} failed in '#{file.path}' -- 
#{error}"
      @_compileDependentFiles file.path
      @_resetTimer()

  _copy: (asset) =>
    asset.copy (error) =>
      logger.debug 'info', "Copied asset '#{asset.path}'"
      if error?
        return logger.error "Copying of '#{asset.path}' failed -- #{error}"
      @_resetTimer()

  _add: (path, compiler, isHelper) ->
    isVendor = @_isVendor path
    file = new SourceFile path, compiler, isHelper, isVendor
    @files.push file
    file

  _addAsset: (path) ->
    file = new Asset path, @config
    @assets.push file
    file

  _change: (path, compiler, isHelper) =>
    if @_isAsset path
      @_copy (@_findAssetByPath(path) ? @_addAsset path)
    else if @_ignored(path) or not compiler
      @_compileDependentFiles path
    else
      @_compile (@_findByPath(path) ? @_add path, compiler, isHelper)

  _unlink: (path) =>
    if @_isAsset path
      @assets.splice(@assets.indexOf(path), 1)
    else if @_ignored path
      @_compileDependentFiles path
    else
      file = @_findByPath path
      @files.splice(@files.indexOf(file), 1)
    @_resetTimer()
