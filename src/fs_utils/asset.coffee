'use strict'

sysPath = require 'path'
helpers = require '../helpers'
logger = require '../logger'
common = require './common'
{ncp} = require 'ncp'

# 'app/assets/thing/thing2.html'
# ['app/', 'app/assets/', 'app/assets/thing/', 'app/assets/thing/thing2.html']
#
getAssetDirectory = (path, convention) ->
  splitted = path.split(common.sep)
  splitted
    .map (part, index) ->
      previous = if index is 0 then '' else splitted[index - 1] + common.sep
      current = part + common.sep
      previous + current
    .filter(convention)[0]

module.exports = class Asset
  constructor: (@path, config) ->
    directory = getAssetDirectory @path, config._normalized.conventions.assets
    @relativePath = sysPath.relative directory, @path
    @destinationPath = sysPath.join config.paths.public, @relativePath
    logger.debug 'asset', "Initializing fs_utils.Asset", {
      @path, directory, @relativePath, @destinationPath
    }
    @error = null
    Object.seal this

  copy: (callback) ->
    common.copy @path, @destinationPath, (error) =>
      if error?
        err = new Error error
        err.brunchType = 'Copying'
        @error = err
      else
        @error = null
      callback @error
