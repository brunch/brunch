sysPath = require 'path'
helpers = require '../helpers'
logger = require '../logger'
common = require './common'
{ncp} = require 'ncp'

module.exports = class Asset
  (@path, config) ->
    isParentDirectory = (dir) -> helpers.startsWith path, dir
    directory = config.paths.assets |> find isParentDirectory
    @relativePath = sysPath.relative directory, @path
    @destinationPath = sysPath.join config.paths.public, @relativePath
    logger.debug "Initializing fs_utils.Asset", {
      @path, @relativePath, @destinationPath
    }
    Object.freeze this

  copy: (callback) ->
    common.copy @path, @destinationPath, callback
