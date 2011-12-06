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

  getRootPath: (subPath) ->
    path.join @options.rootPath, subPath

  getBuildPath: (subPath) ->
    path.join @options.buildPath, subPath

  getClassName: ->
    @constructor.name

  getFormattedClassName: ->
    name = @getClassName().replace 'Compiler', ''
    "[#{name}]:"

  log: (text = 'compiled') ->
    helpers.log "#{@getFormattedClassName()} #{text}."

  logError: (text = '') ->
    helpers.logError "#{@getFormattedClassName()} error. #{text}"

  sort: (files, callback) ->
    callback null, files

  map: (file, callback) ->
    fs.readFile file, callback

  reduce: (memo, file, callback) ->
    callback null, memo + file

  write: (data, callback) ->
    callback null, data
    #fs.writeFile fileName, data, callback

  compile: (files, callback) ->
    console.log 'Sorting', files
    async.sortBy files, @sort, (error, sorted) =>
      return @logError error if error?
      console.log 'Mapping', sorted
      async.map sorted, @map, (error, mapped) =>
        return @logError error if error?
        console.log 'Reducing', mapped
        async.reduce mapped, null, @reduce, (error, reduced) =>
          return @logError error if error?
          console.log 'Writing', reduced
          @write reduced, (error) =>
            return @logError error if error?
            @log()
            callback()

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
