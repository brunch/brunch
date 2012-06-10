'use strict'

sysPath = require 'path'
helpers = require '../helpers'
logger = require '../logger'
common = require './common'
eco = require 'eco'
fs = require 'fs'
{ncp} = require 'ncp'

module.exports = class Asset
  constructor: (@path, config) ->
    directory = config.paths.assets.filter(
      (dir) => helpers.startsWith path, dir
    )[0]
    @extension = sysPath.extname @path
    @relativePath = sysPath.relative directory, @path
    @destinationPath = sysPath.join config.paths.public, @relativePath
    logger.debug 'info', "Initializing fs_utils.Asset", {
      @path, @relativePath, @destinationPath
    }
    Object.freeze this

  copy: (callback) ->
    common.copy @path, @destinationPath, callback

  render: (context, callback) ->
    template = fs.readFileSync @path, 'utf-8'
    renderedTemplate = eco.render template, context
    path = @destinationPath.replace /\.eco$/i, ".html"
    common.writeFile path, renderedTemplate, callback

  isRenderable: ->
    @extension is '.eco'
