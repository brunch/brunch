{EventEmitter} = require 'events'
SourceFile = require './source_file'
logger = require '../logger'

# A list of `fs_utils.SourceFile` with some additional methods
# used to simplify file reading / removing.
module.exports = class SourceFileList extends EventEmitter
  # Maximum time between changes of two files that will be considered
  # as a one compilation.
  RESET_TIME: 100

  constructor: (ignored) ->
    @files = []
    @_ignored = switch toString.call(ignored)
      when '[object RegExp]'
        (string) -> ignored.test(string)
      when '[object Function]'
        ignored
      else
        -> no
    @on 'change', @_change
    @on 'unlink', @_remove

  # Called every time any file was changed.
  # Emits `ready` event after `RESET_TIME`.
  resetTimer: =>
    clearTimeout @timer if @timer?
    @timer = setTimeout (=> @emit 'ready'), @RESET_TIME

  _getByPath: (path) ->
    @files.filter((file) -> file.path is path)[0]

  _compile: (file) ->
    file.compile (error) =>
      logger.debug "Compiled file '#{file.path}'"
      if error?
        compilerName = file.compiler.constructor.name
        return logger.error "#{compilerName} failed in '#{file.path}' -- 
#{error}"
      @resetTimer()

  # Adds new file to list. If file with params.path exists in @files,
  # it will use it.
  _change: (params) =>
    {path, compiler} = params
    return @resetTimer() if (@_ignored path) or not compiler
    file = @_getByPath path
    unless file
      file = new SourceFile path, compiler
      file.isPluginHelper = params.isPluginHelper
      @files = @files.concat [file]
    @_compile file

  # Removes file from list.
  _remove: (path) =>
    return @resetTimer() if @_ignored path
    removed = @_getByPath path
    @files = @files.filter (file) -> file isnt removed
    @resetTimer()
