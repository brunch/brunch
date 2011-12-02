path = require 'path'

helpers = require '../helpers'


class exports.Compiler
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

  # These should be overwritten by every compiler subclass.
  patterns: -> []

  compile: (files, callback) ->
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
    @patterns().some (pattern) -> file.match pattern
