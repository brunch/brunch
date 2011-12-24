class exports.BasePlugin
  constructor: (@options) ->
    null

  getRootPath: (subPathes...) ->
    path.join @options.rootPath, subPathes...

  getBuildPath: (subPathes...) ->
    path.join @options.buildPath, subPathes...

  compile: (callback) ->
    callback()
