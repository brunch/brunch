{Event-emitter} = require 'events'
Asset = require './asset'
Source-file = require './source_file'
helpers = require '../helpers'
logger = require '../logger'
sys-path = require 'path'

# A list of `fs_utils.Source-file` or `fs_utils.Asset`
# with some additional methods used to simplify file reading / removing.
module.exports = class File-list extends Event-emitter
  # Maximum time between changes of two files that will be considered
  # as a one compilation.
  RESET_TIME: 65

  (@config) ->
    @files = []
    @assets = []
    @on 'change', @_change
    @on 'unlink', @_unlink

  # Files that are not really app files.
  _ignored: (path, test = @config.paths.ignored) ->
    switch to-string.call(test)
      when '[object Reg-exp]'
        path.match test
      when '[object Function]'
        test path
      when '[object String]'
        helpers.starts-with(sys-path.normalize(path), sys-path.normalize(test))
      when '[object Array]'
        test.some((sub-test) ~> @_ignored path, sub-test)
      else
        no

  _is-asset: (path) ->
    @config.paths.assets.some((dir) -> helpers.starts-with(path, dir))

  # Called every time any file was changed.
  # Emits `ready` event after `RESET_TIME`.
  _reset-timer: ~>
    clear-timeout @timer if @timer?
    @timer = set-timeout (~> @emit 'ready'), @RESET_TIME

  _find-byPath: (path) ->
    @files |> find (file) -> file.path is path

  _find-asset-byPath: (path) ->
    @assets |> find (file) -> file.path is path

  _compile-dependent-files: (path) ->
    @files
      |> filter (dependent) ~> not empty dependent.cache.dependencies
      |> filter (dependent) ~> path `elem` dependent.cache.dependencies
      |> each @_compile
    @_reset-timer()

  _compile: (file) ~>
    error <~ file.compile
    if error?
      logger.error "#{file.compiler-name} failed in '#{file.path}' -- 
#{error}"
    else
      logger.debug "Compiled file '#{file.path}'"
      @_compile-dependent-files file.path
      @_reset-timer()

  _copy: (asset) ~>
    error <~ asset.copy
    if error?
      logger.error "Copying of '#{asset.path}' failed -- #{error}"
    else
      logger.debug "Copied asset '#{asset.path}'"
      @_reset-timer()

  _add: (path, compiler, is-helper) ->
    is-vendor = helpers.starts-with(path, @config.paths.vendor)
    file = new Source-file path, compiler, is-helper, is-vendor
    @files.push file
    file

  _add-asset: (path) ->
    file = new Asset path, @config
    @assets.push file
    file

  _change: (path, compiler, is-helper) ~>
    if @_is-asset path
      @_copy (@_find-asset-byPath(path) ? @_add-asset path)
    else if @_ignored(path) or not compiler
      @_compile-dependent-files path
    else
      @_compile (@_find-byPath(path) ? @_add path, compiler, is-helper)

  _unlink: (path) ~>
    if @_is-asset path
      @assets.splice(@assets.index-of(path), 1)
    else if @_ignored path
      @_compile-dependent-files path
    else
      file = @_find-byPath path
      @files.splice(@files.index-of(file), 1)
    @_reset-timer()
