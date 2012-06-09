fs = require 'fs'
{EventEmitter} = require 'events'
mkdirp = require 'mkdirp'
{ncp} = require 'ncp'
sysPath = require 'path'
util = require 'util'
logger = require '../logger'

exports.exists = exists = fs.exists or sysPath.exists

# Creates file if it doesn't exist and writes data to it.
# Would also create a parent directories if they don't exist.
#
# path - path to file that would be written.
# data - data to be written
# callback(error, path, data) - would be executed on error or on
#    successful write.
# 
# Example
# 
#   writeFile 'test.txt', 'data', (error) -> console.log error if error?
# 
exports.writeFile = writeFile = (path, data, callback) ->
  logger.debug "Writing file '#{path}'"
  write = (callback) -> fs.writeFile path, data, callback
  error <- write
  if error?
    error <- mkdirp (sysPath.dirname path), 0o755
    if error?
      callback error
    else
      error <- write
      callback error, path, data
  else
    callback null, path, data

# RegExp that would filter invalid files (dotfiles, emacs caches etc).
ignoredRe = /(^(\.|#)|__$)/;

exports.ignored = ignored = (path) ->
  ignoredRe.test(sysPath.basename path)

exports.copy = (source, destination, callback) ->
  copy = (error) ->
    if error?
      logger.error error
    else
      input = fs.createReadStream source
      output = fs.createWriteStream destination
      util.pump input, output, callback

  if ignored source
    callback()
  else
    parentDir = sysPath.dirname(destination)
    parentExists <- exists parentDir
    if parentExists
      copy()
    else
      mkdirp parentDir, copy

# Recursive copy.
exports.copyIfExists = (source, destination, filter = yes, callback) ->
  options = if filter then {filter: ((path) -> not ignored path)} else {}
  sourceExists <- exists source
  if sourceExists
    ncp source, destination, options, callback
  else
    callback()
