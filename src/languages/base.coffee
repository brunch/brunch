fs = require 'fs'
path = require 'path'
async = require 'async'

class exports.BaseLanguage
  queue: async.queue fs.readFile, 5

  constructor: (@options) ->
    null

  getRootPath: (subPathes...) ->
    path.join @options.rootPath, subPathes...

  getBuildPath: (subPathes...) ->
    path.join @options.buildPath, subPathes...

  readFile: (file, callback) ->
    console.log 'Reading file', file
    @queue.push file, (error, data) ->
      callback error, data.toString()

  compile: (file, callback) ->
    @readFile file, callback
