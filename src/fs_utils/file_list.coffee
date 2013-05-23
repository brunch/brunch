'use strict'

debug = require('debug')('brunch:file-list')
{EventEmitter} = require 'events'
Asset = require './asset'
SourceFile = require './source_file'
helpers = require '../helpers'
sysPath = require 'path'

startsWith = (string, substring) ->
  string.lastIndexOf(substring, 0) is 0

# A list of `fs_utils.SourceFile` or `fs_utils.Asset`
# with some additional methods used to simplify file reading / removing.
module.exports = class FileList extends EventEmitter
  # Maximum time between changes of two files that will be considered
  # as a one compilation.
  RESET_TIME: 165

  constructor: (@config) ->
    @files = []
    @assets = []
    @on 'change', @_change
    @on 'unlink', @_unlink
    @compiling = []
    @compiled = []
    @copying = []

  getAssetErrors: ->
    invalidAssets = @assets.filter((asset) -> asset.error?)
    if invalidAssets.length > 0
      invalidAssets.map (invalidAsset) ->
        helpers.formatError invalidAsset.error, invalidAsset.path
    else
      null

  # Files that are not really app files.
  isIgnored: (path, test = @config.conventions.ignored) ->
    return yes if path in [@config.paths.config, @config.paths.packageConfig]

    switch toString.call(test)
      when '[object RegExp]'
        path.match test
      when '[object Function]'
        test path
      when '[object String]'
        startsWith sysPath.normalize(path), sysPath.normalize(test)
      when '[object Array]'
        test.some((subTest) => @isIgnored path, subTest)
      else
        no

  is: (name, path) ->
    convention = @config._normalized.conventions[name]
    return no unless convention
    if typeof convention isnt 'function'
      throw new TypeError "Invalid convention #{convention}"
    convention path

  # Called every time any file was changed.
  # Emits `ready` event after `RESET_TIME`.
  resetTimer: =>
    clearTimeout @timer if @timer?
    @timer = setTimeout =>
      # Clean disposed files.
      @files
        .filter (file) =>
          file.disposed
        .forEach (file, index) =>
          @files.splice index, 1

      if @compiling.length is 0 and @copying.length is 0
        @emit 'ready'
        @compiled = []
      else
        @resetTimer()
    , @RESET_TIME

  find: (path) ->
    @files.filter((file) -> file.path is path)[0]

  findAsset: (path) ->
    @assets.filter((file) -> file.path is path)[0]

  compileDependentFiles: (path) ->
    @files
      .filter (dependent) =>
        dependent.dependencies.length > 0
      .filter (dependent) =>
        path in dependent.dependencies
      .filter (dependent) =>
        dependent not in @compiled
      .forEach(@compile)

  compile: (file) =>
    if @compiling.indexOf(file) == -1
      @compiling.push(file)
      file.compile (error) =>
        @compiling.splice @compiling.indexOf(file), 1
        @resetTimer()
        return if error?
        debug "Compiled file '#{file.path}'..."
        @compiled.push file
        @compileDependentFiles file.path
    else
      @resetTimer()

  copy: (asset) =>
    @copying.push asset
    asset.copy (error) =>
      @copying.splice @copying.indexOf(asset), 1
      @resetTimer()
      return if error?
      debug "Copied asset '#{asset.path}'"

  _add: (path, compiler, linters, isHelper) ->
    isVendor = @is 'vendor', path
    wrapper = @config._normalized.modules.wrapper
    file = new SourceFile path, compiler, linters, wrapper, isHelper, isVendor
    @files.push file
    file

  _addAsset: (path) ->
    file = new Asset path, @config
    @assets.push file
    file

  _change: (path, compiler, linters, isHelper) =>
    ignored = @isIgnored path
    if @is 'assets', path
      unless ignored
        @copy (@findAsset(path) ? @_addAsset path)
    else
      if ignored or not compiler
        @compileDependentFiles path
      else
        @compile (@find(path) ? @_add path, compiler, linters, isHelper)

  _unlink: (path) =>
    ignored = @isIgnored path
    if @is 'assets', path
      unless ignored
        @assets.splice(@assets.indexOf(path), 1)
    else
      if ignored
        @compileDependentFiles path
      else
        file = @find path
        file.removed = true
    @resetTimer()
