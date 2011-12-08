fs = require 'fs'
path = require 'path'
async = require 'async'

helpers = require '../helpers'

read = (file) =>
  fs.readFile(file).toString()

class exports.Compiler
  patterns: []

  constructor: (@options) ->
    null

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
    fs.readFile file, callback

  reduce: (memo, file, callback) ->
    callback null, memo + file

  write: (data, callback) ->
    callback null, data
    #fs.writeFile fileName, data, callback

  compile: (files, callback) ->
    log = console.log
    log = (value, _) => console.log value, @getClassName()
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

  clearQueue: (callback) ->
    @compile @changedFiles, callback
    @changedFiles = []
  
  addToQueue: (file) ->
    @changedFiles ?= []
    @changedFiles.push file

  # Can be overwritten to change behavior on file changed events.
  # By default waits 20ms for file events then calls compile with
  # all changed files.
  onFileChanged: (file, callback) ->
    @addToQueue file
    clearTimeout @timeout if @timeout?
    @timeout = setTimeout (=> @clearQueue callback), 20

  matchesFile: (file) ->
    @patterns.some (pattern) ->
      file.match pattern


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
