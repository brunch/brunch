'use strict'

debug = require('debug')('brunch:common')
fs = require 'fs'
mkdirp = require 'mkdirp'
{ncp} = require 'ncp'
os = require 'os'
sysPath = require 'path'

# Short-cut to `exists` function that works on both node 0.6 and 0.8+.
exports.exists = fs.exists or sysPath.exists

# Directory separator.
exports.sep = sysPath.sep or (if os.platform() is 'win32' then '\\' else '/')

# Create file if it doesn't exist and writes data to it.
# Would also create a parent directories if they don't exist.
#
# path - String. Path to file that would be written.
# data - String. Data to be written.
# callback(error, path, data) - would be executed on error or on
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

# RegExp that would filter invalid files (dotfiles, emacs caches etc).
exports.ignored = ignored = (path) ->
  /(^[.#]|(?:__|~)$)/.test sysPath.basename path

# Files that should be always ignored (git / mercurial metadata etc).
exports.ignoredAlways = ignoredAlways = (path) ->
  /^\.(git|hg)$/.test sysPath.basename path

# Copy file.
#
# source      - String. Path to file that will be copied.
# destination - String. File system path that will be created etc.
# callback    - Function.
#
# Returns nothing.
copyCounter = 0
copyQueue = []
exports.copy = (source, destination, callback) ->
  return callback() if ignored source
  copy = (error, retries = 0) ->
    return callback error if error?
    copyCounter++
    instanceError = false
    fsStreamErrHandler = (err) ->
      return if instanceError
      instanceError = true
      copyCounter--
      switch (if retries < 5 then err.code)
        when 'OK', 'UNKNOWN', 'EMFILE'
          copyQueue.push -> copy null, ++retries
        when 'EBUSY'
          setTimeout (-> copy null, retries), 100 * ++retries 
        else
          debug "File copy: #{err}"
          callback err
    input = fs.createReadStream source
    output = input.pipe fs.createWriteStream destination
    input.on  'error', fsStreamErrHandler
    output.on 'error', fsStreamErrHandler
    output.on 'finish', ->
      if --copyCounter < 1 and copyQueue.length
        process.nextTick copyQueue.shift()
      callback()
  parentDir = sysPath.dirname(destination)
  exports.exists parentDir, (exists) ->
    if exists
      if copyQueue.length
        copyQueue.push copy
      else
        copy()
    else
      mkdirp parentDir, copy

# Recursively copy files from one directory to another.
# Ignores dotfiles and stuff in process.

# source      - String.
# destination - String.
# filter      - Boolean.
# callback    - Function.
#
# Returns nothing.
exports.copyIfExists = (source, destination, filter = true, callback) ->
  options = stopOnError: true
  options.filter = if filter
    (path) -> not ignored path
  else
    (path) -> not ignoredAlways path
  exports.exists source, (exists) ->
    return callback() unless exists
    ncp source, destination, options, callback
