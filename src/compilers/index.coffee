_ = require 'underscore'
helpers = require '../helpers'

class exports.Compiler
  # should be overwritten by every compiler subclass
  filePattern: -> []

  matchesFile: (file) ->
    _.any(this.filePattern(), (pattern) -> file.match(pattern))

  # should be overwritten by every compiler subclass
  compile: (files) -> #NOOP

  # can be overwritten to change behavior on file changed events
  # by default waits 20ms for file events then calls compile with all changed files
  fileChanged: (file) ->
    @_changed_files ||= []
    @_changed_files.push(file)
    clearTimeout(@_timeout)
    @_timeout = setTimeout( =>
      _.bind(@compile, @, @_changed_files)()
      @_changed_files = null
    , 20)

exports.StitchCompiler = require('./stitch').StitchCompiler
exports.StylusCompiler = require('./stylus').StylusCompiler
