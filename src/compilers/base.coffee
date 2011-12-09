fs = require 'fs'
path = require 'path'
async = require 'async'

helpers = require '../helpers'

# Takes 2-element array.
# Examples
# 
#   coffee> group [['a', 1], ['b', 2], ['a', 3], ['c', 4], ['a', 0]]
#   [['a', [1, 3, 0]], ['b', [2]], ['c', [4]]]
#
# Returns new array in format [[key, values]].
group = (items) ->
  itemsMap = {}
  for [destination, data] in items
    (itemsMap[destination] ?= []).push data
  ([file, dataArray] for file, dataArray of itemsMap)


class Queue
  timeout: 20

  constructor: ->
    @items = []
    @timeoutId = null

  clear: (callback) ->
    callback @items
    @items = []

  add: (item, onClear) ->
    callback = if @beforeClear?
      (items) => @beforeClear items, onClear
    else
      onClear
    @items.push item
    clearTimeout @timeoutId if @timeoutId?
    @timeoutId = setTimeout (=> @clear callback), @timeout


# Queue, that would be used for tracking file writing in compilers.
# For example, both SASS & CSS compilers use one output file: `main.css`.
class WriteQueue extends Queue
  timeout: 200

  beforeClear: (items, onWrite) ->
    items = group items
    async.forEach items, ([file, dataArray], next) =>
      fs.writeFile file, dataArray.join(''), next
    , onWrite


writeQueue = new WriteQueue


class exports.Compiler
  patterns: []

  constructor: (@options) ->
    @queue = new Queue

  getRootPath: (subPathes...) ->
    path.join @options.rootPath, subPathes...

  getBuildPath: (subPathes...) ->
    path.join @options.buildPath, subPathes...

  getClassName: ->
    @constructor.name

  getFormattedClassName: ->
    name = @getClassName().replace 'Compiler', ''
    "[#{name}]:"

  log: (text = 'compiled') ->
    helpers.log "#{@getFormattedClassName()} #{text}."

  logError: (text = '') ->
    helpers.logError "#{@getFormattedClassName()} error. #{text}"

  sort: (file, callback) ->
    callback null, file

  map: (file, callback) ->
    callback null, file

  reduce: (memo, file, callback) ->
    callback null, memo

  write: (data, callback) ->
    callback null, data

  compile: (files, callback) ->
    log = ->
    #log = console.log
    #log = (value, _) => console.log value, @getClassName()
    log 'Sorting', files
    async.sortBy files, @sort, (error, sorted) =>
      return @logError error if error?
      log 'Mapping', sorted
      async.map sorted, @map, (error, mapped) =>
        return @logError error if error?
        log 'Reducing', mapped
        async.reduce mapped, null, @reduce, (error, reduced) =>
          return @logError error if error?
          log 'Writing', reduced
          @write reduced, (error) =>
            return @logError error if error?
            @log()
            callback @getClassName()

  # Can be overwritten to change behavior on file changed events.
  # By default waits 20ms for file events then calls compile with
  # all changed files.
  onFileChanged: (file, callback) ->
    @queue.add file, (changedFiles) =>
      @compile changedFiles, callback

  matchesFile: (file) ->
    @patterns.some (pattern) ->
      file.match pattern


# Compiler that concatenates all files (e.g. main.css + helpers.css).
class exports.ConcatenatingCompiler extends exports.Compiler
  constructor: ->
    super
    @globalWriteQueue = writeQueue

  map: (file, callback) ->
    fs.readFile file, (error, result) =>
      callback error, result.toString()

  reduce: (memo, file, callback) ->
    memo ?= ''
    callback null, memo + file

  write: (data, callback) ->
    @globalWriteQueue.add [@getBuildPath(@destination), data], callback


# Compiler that just copies all files from @sourceDirectory to build dir.
class exports.CopyingCompiler extends exports.Compiler
  map: (file, callback) ->
    callback null, file

  reduce: (memo, file, callback) ->
    (memo ?= []).push file
    callback null, memo

  write: (files, callback) ->
    unless @sourceDirectory
      return callback 'You need to define "sourceDirectory"
field in copying compilers'

    sourceDirectory = path.resolve @getRootPath @sourceDirectory
    async.forEach files, (source, cb) =>
      destination = @getBuildPath path.resolve(source).replace sourceDirectory, ''
      copy = =>
        helpers.copyFile source, destination, cb
      destinationDirectory = path.dirname destination
      fs.stat destinationDirectory, (error, stats) =>
        if error?
          process.nextTick =>
            try
              # fileUtil.mkdirs doesn't work properly.
              fileUtil.mkdirsSync path.resolve(destinationDirectory), 0755
              copy()
            catch error
              return
        copy()
    , callback
