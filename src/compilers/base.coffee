path = require "path"
_ = require "underscore"

helpers = require "../helpers"


class exports.Compiler
  constructor: (@options) -> null
  getPath: (subPath) -> path.join @options.brunchPath, subPath
  getBuildPath: (subPath) -> path.join @options.buildPath, subPath

  # These should be overwritten by every compiler subclass.
  patterns: -> []
  compile: (files) -> null

  # Can be overwritten to change behavior on file changed events.
  # By default waits 20ms for file events then calls compile with
  # all changed files.
  fileChanged: (file) ->
    @changedFiles ?= []
    @changedFiles.push file
    clearTimeout @timeout
    @timeout = setTimeout =>
      _.bind(@compile, @, @changedFiles)()
      @changedFiles = undefined
    , 20

  matchesFile: (file) -> _.any @patterns(), (pt) -> file.match pt
