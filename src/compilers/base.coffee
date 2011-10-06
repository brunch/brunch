path = require "path"

helpers = require "../helpers"


class exports.Compiler
  constructor: (@options) -> null
  getPath: (subPath) ->
    path.join @options.brunchPath, subPath

  getBuildPath: (subPath) ->
    path.join @options.buildPath, subPath

  getClassName: ->
    name = @constructor.name.replace "Compiler", ""
    "[#{name}]:"

  log: (text = "OK") ->
    helpers.logSuccess "#{@getClassName()} #{text}."

  logError: (text) ->
    helpers.logError "#{@getClassName()} error. #{text}"

  # These should be overwritten by every compiler subclass.
  patterns: -> []

  compile: (files, callback) -> callback @constructor.name

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

  matchesFile: (file) -> _.any @patterns(), (pt) -> file.match pt
