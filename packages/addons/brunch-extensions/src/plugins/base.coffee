path = require 'path'

class exports.BasePlugin
  constructor: (@config) ->

  getRootPath: (subPathes...) ->
    path.join @config.rootPath, subPathes...

  getBuildPath: (subPathes...) ->
    path.join @config.buildPath, subPathes...

  load: (files, callback) ->
    callback()
