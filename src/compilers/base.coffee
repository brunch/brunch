_ = require 'underscore'
helpers = require '../helpers'

class exports.Compiler

  constructor: (@options) ->

  # should be overwritten by every compiler subclass
  filePattern: -> []

  matchesFile: (file) ->
    _.any(@filePattern(), (pattern) -> file.match(pattern))

  # should be overwritten by every compiler subclass
  compile: (files) -> #NOOP

  # can be overwritten to change behavior on file changed events
  # by default waits 20ms for file events then calls compile with all changed files
  fileChanged: (file) ->
    @changedFiles ||= []
    @changedFiles.push(file)
    clearTimeout(@timeout)
    @timeout = setTimeout( =>
      _.bind(@compile, @, @changedFiles)()
      @changedFiles = null
    , 20)
