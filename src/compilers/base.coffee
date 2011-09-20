_ = require "underscore"
path = require "path"
fs = require "fs"
fileUtil = require "file"

helpers = require "../helpers"

class exports.Compiler
  constructor: (@rootPath, @options) -> null

  getPath: (subPath) ->
    path.join @options.rootPath, subPath

  getBuildPath: (subPath) ->
    path.join @options.buildPath, subPath

  getClassName: ->
    name = @constructor.name.replace "Compiler", ""
    "[#{name}]:"

  patterns: -> @options.filePattern

  log: (text = "OK") ->
    helpers.logSuccess "#{@getClassName()} #{text}."

  logError: (text) ->
    helpers.logError "#{@getClassName()} error. #{text}"

  # These should be overwritten by every compiler subclass.
  compile: (files) -> null

  # generates path suitable for useage within the compiler
  # should be used prior every file handling done within the compiler
  generatePath: (dirPath) -> path.resolve @rootPath, dirPath

  # writes content to file - creates intermediate directories as needed
  writeToFile: (filePath, content, callback) ->
    filePath = @generatePath filePath
    dirPath = path.dirname(filePath)
    fileUtil.mkdirs dirPath, 0755, (error) =>
      if error?
        @logError "couldn't create build path."
        callback error if callback?
      else
        fs.writeFile filePath, content, (error) =>
          @logError "couldn't write compiled file. #{error}" if error?
          callback error if callback?

  clearQueue: ->
    _.bind(@compile, @, @changedFiles)()
    @changedFiles = []

  addToQueue: (file) ->
    @changedFiles ?= []
    @changedFiles.push file

  # Can be overwritten to change behavior on file changed events.
  # By default waits 20ms for file events then calls compile with
  # all changed files.
  onFileChanged: (file) ->
    @addToQueue file
    clearTimeout @timeout if @timeout?
    @timeout = setTimeout (=> @clearQueue()), 20

  matchesFile: (file) -> _.any @patterns(), (pt) -> file.match pt
