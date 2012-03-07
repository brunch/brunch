{EventEmitter} = require 'events'

class exports.SourceFileList extends EventEmitter
  RESET_TIME: 100

  constructor: ->
    @files = []

  resetTimer: ->
    clearTimeout @timer if @timer?
    @timer = setTimeout (=> @emit 'resetTimer'), @RESET_TIME

  get: (searchFunction) ->
    (@files.filter searchFunction)[0] 

  add: (file) ->
    @files = @files.concat [file]
    compilerName = file.compiler.constructor.name
    file.compile (error, result) =>
      logger.log 'debug', "Compiling file '#{file.path}'"
      if error?
        return logger.error "#{compilerName} failed in '#{file.path}' -- 
#{error}"
      @resetTimer()

  remove: (path) ->
    removed = @get (file) -> file.path is path
    @files = @files.filter (file) -> file isnt removed
    delete removed
    @resetTimer()
