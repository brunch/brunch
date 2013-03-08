'use strict'

debug = require('debug')('brunch:asset')
sysPath = require 'path'
helpers = require '../helpers'
common = require './common'
{ncp} = require 'ncp'

# Get first parent directory that matches asset convention.
#
# Example:
#   getAssetDirectory 'app/assets/thing/thing2.html', /assets/
#   # => app/assets/
#
# Returns String.
getAssetDirectory = (path, convention) ->
  splitted = path.split(common.sep)
  # Creates thing like this
  # 'app/', 'app/assets/', 'app/assets/thing/', 'app/assets/thing/thing2.html'
  splitted
    .map (part, index) ->
      previous = if index is 0 then '' else splitted[index - 1] + common.sep
      current = part + common.sep
      previous + current
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
      callback @error
