{EventEmitter} = require 'events'
{SourceFile} = require './source_file'
logger = require '../logger'

# A list of `fs_utils.SourceFile` with some additional methods
# used to simplify file reading / removing.
class exports.SourceFileList extends EventEmitter
  # Maximum time between changes of two files that will be considered
  # as a one compilation.
  RESET_TIME: 100

  constructor: ->
    @files = []

  # Called every time any file was changed.
  # Emits `resetTimer` event after `RESET_TIME`.
  resetTimer: ->
    clearTimeout @timer if @timer?
    @timer = setTimeout (=> @emit 'resetTimer'), @RESET_TIME

  getByPath: (path) ->
    (@files.filter (file) -> file.path is path)[0]

  # Adds new file to list. If file with params.path exists in @files,
  # it will use it.
  add: (params) ->
    {path, compiler, isPluginHelper} = params
    file = (@getByPath path)
    unless file
      file = new SourceFile path, compiler
      file.isPluginHelper = isPluginHelper
      @files = @files.concat [file]
    compilerName = file.compiler.constructor.name
    file.compile (error, result) =>
      logger.log 'debug', "Compiled file '#{file.path}'"
      if error?
        return logger.error "#{compilerName} failed in '#{file.path}' -- 
#{error}"
      @resetTimer()

  # Removes file from list.
  remove: (path) ->
    removed = @getByPath path
    @files = @files.filter (file) -> file isnt removed
    delete removed
    @resetTimer()
