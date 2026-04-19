async = require 'async'
{ncp} = require 'ncp'
path = require 'path'
{BasePlugin} = require './base'

class exports.AssetsPlugin extends BasePlugin
  load: (files, callback) ->
    from = path.resolve @getRootPath 'app', 'assets'
    to = path.resolve @getBuildPath ''
    ncp from, to, (error) ->
      callback error, files
