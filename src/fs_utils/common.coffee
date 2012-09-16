'use strict'

fs = require 'fs'
{EventEmitter} = require 'events'
mkdirp = require 'mkdirp'
{ncp} = require 'ncp'
os = require 'os'
sysPath = require 'path'
logger = require '../logger'

exports.exists = fs.exists or sysPath.exists
exports.sep = sysPath.sep or (if os.platform() is 'win32' then '\\' else '/')

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
exports.writeFile = (path, data, callback) ->
  logger.debug 'writer', "Writing file '#{path}'"
  write = (callback) -> fs.writeFile path, data, callback
  write (error) ->
    return callback null, path, data unless error?
    mkdirp (sysPath.dirname path), 0o755, (error) ->
      return callback error if error?
      write (error) ->
        callback error, path, data

# RegExp that would filter invalid files (dotfiles, emacs caches etc).
exports.ignored = ignored = (path) ->
  /(^[.#]|(?:__|~)$)/.test sysPath.basename path

exports.ignoredAlways = ignoredAlways = (path) ->
  /^\.(git|hg)$/.test sysPath.basename path

exports.copy = (source, destination, callback) ->
  return callback() if ignored source
  copy = (error) ->
    return callback error if error?
    input = fs.createReadStream source
    output = fs.createWriteStream destination
    request = input.pipe output
    request.on 'close', callback
  parentDir = sysPath.dirname(destination)
  exports.exists parentDir, (exists) ->
    if exists
      copy()
    else
      mkdirp parentDir, copy

# Recursive copy.
exports.copyIfExists = (source, destination, filter = yes, callback) ->
  options = if filter
    {filter: (path) -> not ignored path}
  else
    {filter: (path) -> not ignoredAlways path}
  options.stopOnError = true
  exports.exists source, (exists) ->
    return callback() unless exists
    ncp source, destination, options, callback
