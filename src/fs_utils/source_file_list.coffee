{EventEmitter} = require 'events'
{SourceFile} = require './source_file'
logger = require '../logger'

class exports.SourceFileList extends EventEmitter
  RESET_TIME: 100

  constructor: ->
    @files = []

  resetTimer: ->
    clearTimeout @timer if @timer?
    @timer = setTimeout (=> @emit 'resetTimer'), @RESET_TIME

  getByPath: (path) ->
    (@files.filter (file) -> file.path is path)[0]

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

  remove: (path) ->
    removed = @getByPath path
    @files = @files.filter (file) -> file isnt removed
    delete removed
    @resetTimer()
