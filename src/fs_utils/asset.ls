sys-path = require 'path'
helpers = require '../helpers'
logger = require '../logger'
common = require './common'
{ncp} = require 'ncp'

module.exports = class Asset
  (@path, config) ->
    is-parent-directory = (dir) -> helpers.starts-with path, dir
    directory = config.paths.assets |> find is-parent-directory
    @relative-path = sys-path.relative directory, @path
    @destination-path = sys-path.join config.paths.public, @relative-path
    logger.debug "Initializing fs_utils.Asset", {
      @path, @relative-path, @destination-path
    }
    Object.freeze this

  copy: (callback) ->
    common.copy @path, @destination-path, callback
