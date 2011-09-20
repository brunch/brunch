_ = require "underscore"
path = require "path"

class exports.PathMatcher
  constructor: (@dsl, filePattern) ->
    @options =
      filePattern: _.flatten [filePattern]

  use: (compiler, options = {}) ->
    @name = compiler
    _.extend(@options, options)
    @

  output: (filePath) ->
    # if absolute path just use it, if relative path prepend additional build path
    @options.output = if (filePath[0] == '/') then filePath else path.join(@dsl._buildPath, filePath)
