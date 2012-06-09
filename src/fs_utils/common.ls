fs = require 'fs'
{Event-emitter} = require 'events'
mkdirp = require 'mkdirp'
{ncp} = require 'ncp'
sys-path = require 'path'
util = require 'util'
logger = require '../logger'

exports.exists = exists = fs.exists or sys-path.exists

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
#   write-file 'test.txt', 'data', (error) -> console.log error if error?
# 
exports.write-file = write-file = (path, data, callback) ->
  logger.debug "Writing file '#{path}'"
  write = (callback) -> fs.write-file path, data, callback
  error <- write
  if error?
    error <- mkdirp (sys-path.dirname path), 0o755
    if error?
      callback error
    else
      error <- write
      callback error, path, data
  else
    callback null, path, data

# Reg-exp that would filter invalid files (dotfiles, emacs caches etc).
ignored-re = /(^(\.|#)|__$)/;

exports.ignored = ignored = (path) ->
  ignored-re.test(sys-path.basename path)

exports.copy = (source, destination, callback) ->
  copy = (error) ->
    if error?
      logger.error error
    else
      input = fs.create-read-stream source
      output = fs.create-write-stream destination
      util.pump input, output, callback

  if ignored source
    callback()
  else
    parent-dir = sys-path.dirname(destination)
    parent-exists <- exists parent-dir
    if parent-exists
      copy()
    else
      mkdirp parent-dir, copy

# Recursive copy.
exports.copy-ifExists = (source, destination, filter = yes, callback) ->
  options = if filter then {filter: ((path) -> not ignored path)} else {}
  source-exists <- exists source
  if source-exists
    ncp source, destination, options, callback
  else
    callback()
