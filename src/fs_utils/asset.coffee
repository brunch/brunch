sysPath = require 'path'
helpers = require '../helpers'
logger = require '../logger'
common = require './common'
{ncp} = require 'ncp'

module.exports = class Asset
  constructor: (@path, config) ->
    directory = config.paths.assets.filter(
      (dir) => helpers.startsWith path, dir
    )[0]
    @relativePath = sysPath.relative directory, @path
    @destinationPath = sysPath.join config.paths.public, @relativePath
    logger.debug "Initializing fs_utils.Asset", {
      @path, @relativePath, @destinationPath
    }
    Object.freeze this

  copy: (callback) ->
    common.copy @path, @destinationPath, callback
