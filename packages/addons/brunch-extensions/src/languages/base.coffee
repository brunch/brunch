fs = require 'fs'
pathModule = require 'path'
async = require 'async'

class exports.BaseLanguage
  # Limit a number of files read at the same time to 5.
  queue: async.queue fs.readFile, 5

  constructor: (@config) ->

  getRootPath: (subPathes...) ->
    pathModule.join @config.rootPath, subPathes...

  getBuildPath: (subPathes...) ->
    pathModule.join @config.buildPath, subPathes...

  readFile: (path, callback) ->
    @queue.push path, (error, data) ->
      callback error, data.toString()

  compile: (path, callback) ->
    @readFile path, callback
