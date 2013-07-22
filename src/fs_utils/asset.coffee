'use strict'

debug = require('debug')('brunch:asset')
sysPath = require 'path'
common = require './common'

# Get first parent directory that matches asset convention.
#
# Example:
#   getAssetDirectory 'app/assets/thing/thing2.html', /assets/
#   # => app/assets/
#
# Returns String.
getAssetDirectory = (path, convention) ->
  split = path.split(common.sep)
  # Creates thing like this
  # 'app/', 'app/assets/', 'app/assets/thing/', 'app/assets/thing/thing2.html'
  split
    .map (part, index) ->
      split.slice(0, index).concat([part, '']).join(common.sep)
    .filter(convention)[0]

# A static file that shall be copied to public directory.
module.exports = class Asset
  constructor: (@path, config) ->
    directory = getAssetDirectory @path, config._normalized.conventions.assets
    @relativePath = sysPath.relative directory, @path
    @destinationPath = sysPath.join config.paths.public, @relativePath
    debug "Initializing fs_utils.Asset %s", JSON.stringify {
      @path, directory, @relativePath, @destinationPath
    }
    @error = null
    @copyTime = null
    Object.seal this

  # Copy file to public directory.
  copy: (callback) ->
    common.copy @path, @destinationPath, (error) =>
      if error?
        err = new Error error
        err.brunchType = 'Copying'
        @error = err
      else
        @error = null
      @copyTime = Date.now()
      callback @error
