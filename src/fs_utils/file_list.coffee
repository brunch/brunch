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
    @compiling = []
    @copying = []

  getAssetErrors: ->
    invalidAssets = @assets.filter((asset) -> asset.error?)
    if invalidAssets.length > 0
      invalidAssets.map (invalidAsset) ->
        helpers.formatError invalidAsset.error, invalidAsset.path
    else
      null

  # Files that are not really app files.
  _ignored: (path, test = @config.conventions.ignored) ->
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
    @config._normalized.conventions.assets(path)

  _isVendor: (path) ->
    @config._normalized.conventions.vendor(path)

  # Called every time any file was changed.
  # Emits `ready` event after `RESET_TIME`.
  _resetTimer: =>
    clearTimeout @timer if @timer?
    @timer = setTimeout =>
      if @compiling.length is 0 and @copying.length is 0
        @emit 'ready'
      else
        @_resetTimer()
    , @RESET_TIME

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

  _compile: (file) =>
    @compiling.push(file)
    file.compile (error) =>
      @compiling.splice @compiling.indexOf(file), 1
      @_resetTimer()
      return if error?
      logger.debug 'info', "Compiled file '#{file.path}'"
      @_compileDependentFiles file.path

  _copy: (asset) =>
    @copying.push asset
    asset.copy (error) =>
      @copying.splice @copying.indexOf(asset), 1
      @_resetTimer()
      return if error?
      logger.debug 'info', "Copied asset '#{asset.path}'"

  _add: (path, compiler, linters, isHelper) ->
    isVendor = @_isVendor path
    wrapper = @config._normalized.modules.wrapper
    file = new SourceFile path, compiler, linters, wrapper, isHelper, isVendor
    @files.push file
    file

  _addAsset: (path) ->
    file = new Asset path, @config
    @assets.push file
    file

  _change: (path, compiler, linters, isHelper) =>
    ignored = @_ignored path
    if @_isAsset path
      unless ignored
        @_copy (@_findAssetByPath(path) ? @_addAsset path)
    else
      if ignored or not compiler
        @_compileDependentFiles path
      else
        @_compile (@_findByPath(path) ? @_add path, compiler, linters, isHelper)
  _unlink: (path) =>
    ignored = @_ignored path
    if @_isAsset path
      unless ignored
        @assets.splice(@assets.indexOf(path), 1)
    else
      if ignored
        @_compileDependentFiles path
      else
        file = @_findByPath path
        @files.splice(@files.indexOf(file), 1)
    @_resetTimer()
