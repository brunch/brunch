fs = require 'fs'
path = require 'path'
async = require 'async'
helpers = require '../helpers'

class exports.Compiler
  patterns: []
  queue: async.queue (file, callback) =>
    fs.readFile file, callback
  , 5

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
    return @logError error if error?
    @log()
    callback @getClassName()

  matchesFile: (file) ->
    @patterns.some (pattern) ->
      pattern.test file

class exports.ConcatenatingCompiler extends exports.Compiler
  compile: (file, callback) ->
    @readFile file, (error, data) =>
      callback error, 
        destinationPath: @getBuildPath @destination
        path: @getRootPath file
        data: data

# Compiler that just copies all files from @sourceDirectory to build dir.
class exports.CopyingCompiler extends exports.Compiler
  compile: (files, callback) ->
    unless @sourceDirectory
      return callback 'You need to define "sourceDirectory"
field in copying compilers'
    callback null, null
    return

    sourceDirectory = path.resolve @getRootPath @sourceDirectory
    async.forEach files, (source, next) =>
      destination = @getBuildPath path.resolve(source).replace sourceDirectory, ''
      copy = =>
        helpers.copyFile source, destination, next
      destinationDirectory = path.dirname destination
      fs.stat destinationDirectory, (error, stats) =>
        if error?
          process.nextTick =>
            try
              # fileUtil.mkdirs doesn't work properly.
              fileUtil.mkdirsSync path.resolve(destinationDirectory), 0755
              copy()
            catch error
              return
        else
          copy()
    , callback
