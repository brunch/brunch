'use strict'

{exec} = require 'child_process'
mkdirp = require 'mkdirp'
rimraf = require 'rimraf'
sysPath = require 'path'
helpers = require '../helpers'
logger = require '../logger'
fs_utils = require '../fs_utils'

# Remove git metadata and run npm install.
removeAndInstall = (rootPath, callback) ->
  rimraf (sysPath.join rootPath, '.git'), (error) ->
    return logger.error error if error?
    helpers.install rootPath, callback

copySkeleton = (skeletonPath, rootPath, callback) ->
  skeletonDir = sysPath.join __dirname, '..', '..', 'skeletons'
  skeletonPath ?= sysPath.join skeletonDir, 'brunch-with-chaplin'
  logger.debug 'info', "Copying skeleton from #{skeletonPath}"

  copyDirectory = (from) ->
    fs_utils.copyIfExists from, rootPath, no, (error) ->
      return logger.error error if error?
      logger.info 'Created brunch directory layout'
      removeAndInstall rootPath, callback

  mkdirp rootPath, 0o755, (error) ->
    return logger.error error if error?
    fs_utils.exists skeletonPath, (exists) ->
      unless exists
        return logger.error "Skeleton '#{skeletonPath}' doesn't exist"
      copyDirectory skeletonPath

cloneSkeleton = (address, rootPath, isGitHubUrl, callback) ->
  URL = if isGitHubUrl
    "git://github.com/#{address.replace('github://', '')}.git"
  else
    address
  logger.debug 'info', "Cloning skeleton from git URL #{URL}"
  exec "git clone #{URL} #{rootPath}", (error, stdout, stderr) ->
    return logger.error "Git clone error: #{stderr.toString()}" if error?
    logger.info 'Created brunch directory layout'
    removeAndInstall rootPath, callback

module.exports = create = (options, callback = (->)) ->
  {rootPath, skeleton} = options
  re = /(?:https?|git(hub)?)(?::\/\/|@)/

  fs_utils.exists rootPath, (exists) ->
    return logger.error "Directory '#{rootPath}' already exists" if exists
    isGitUrl = skeleton?.match re
    isGitHubUrl = Boolean isGitUrl?[1]
    if isGitUrl
      cloneSkeleton skeleton, rootPath, isGitHubUrl, callback
    else
      copySkeleton skeleton, rootPath, callback
