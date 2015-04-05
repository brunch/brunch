'use strict'

debug = require('debug')('brunch:common')
copyFile = require 'quickly-copy-file'
fs = require 'fs'
mkdirp = require 'mkdirp'
sysPath = require 'path'

# Supports node 0.12+, 0.8 and 0.6 styles.
exports.exists = if fs.access
  (path, callback) -> fs.access(path, (error) -> callback not error)
else
  fs.exists or sysPath.exists

# Writes data into a file.
# Creates the file and/or all parent directories if they don't exist.
#
# path - String. Path to the file.
# data - String. Data to be written.
# callback(error, path, data) - Executed on error or on
#    successful write.
#
# Example
#
#   writeFile 'test.txt', 'data', (error) -> console.log error if error?
#
# Returns nothing.
exports.writeFile = (path, data, callback) ->
  debug "Writing file '#{path}'"
  write = (callback) -> fs.writeFile path, data, callback
  write (error) ->
    return callback null, path, data unless error?
    mkdirp (sysPath.dirname path), 0o755, (error) ->
      return callback error if error?
      write (error) ->
        callback error, path, data

# RegExp that filters out invalid files (dotfiles, emacs caches etc).
exports.ignored = ignored = do ->
  re1 = /\.(?!htaccess|rewrite)/
  re2 = /(^[.#]|(?:__|~)$)/
  (path) ->
    base = sysPath.basename path
    re1.test(base) and re2.test(base)

# Files that should always be ignored (git / mercurial metadata etc).
exports.ignoredAlways = ignoredAlways = (path) ->
  /^\.(git|hg)$/.test sysPath.basename path

exports.copy = (source, destination, callback) ->
  return callback() if ignored source
  copyFile source, destination, callback
