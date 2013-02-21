'use strict'

{exec} = require 'child_process'
debug = require('debug')('brunch:create')
mkdirp = require 'mkdirp'
sysPath = require 'path'
rimraf = require 'rimraf'
helpers = require '../helpers'
logger = require '../logger'
fs_utils = require '../fs_utils'

# Copy skeleton from file system.
#
# skeletonPath - String, file system path from which files will be taken.
# rootPath     - String, directory to which skeleton files will be copied.
# callback     - Function.
#
copySkeleton = (skeletonPath, rootPath, callback) ->
  defaultDir = sysPath.join __dirname, '..', '..', 'skeletons'
  skeletonPath ?= sysPath.join defaultDir, 'brunch-with-chaplin'
  debug "Copying skeleton from #{skeletonPath}"

  copyDirectory = (from) ->
    fs_utils.copyIfExists from, rootPath, no, (error) ->
      return logger.error error if error?
      logger.info 'Created brunch directory layout'
      helpers.install rootPath, callback

  mkdirp rootPath, 0o755, (error) ->
    return logger.error error if error?
    fs_utils.exists skeletonPath, (exists) ->
      unless exists
        return logger.error "Skeleton '#{skeletonPath}' doesn't exist"
      copyDirectory skeletonPath

# Clones skeleton from URI.
#
# address     - String, URI. https:, github: or git: may be used.
# rootPath    - String, directory to which skeleton files will be copied.
# callback    - Function.
#
# Returns nothing.
cloneSkeleton = (address, rootPath, callback) ->
  gitHubRe = /(gh|github)\:\/\//
  URL = if gitHubRe.test address
    "git://github.com/#{address.replace('github://', '')}.git"
  else
    address
  debug "Cloning skeleton from git URL #{URL}"
  exec "git clone #{URL} #{rootPath}", (error, stdout, stderr) ->
    return logger.error "Git clone error: #{stderr.toString()}" if error?
    logger.info 'Created brunch directory layout'
    rimraf (sysPath.join rootPath, '.git'), (error) ->
      return logger.error error if error?
      helpers.install rootPath, callback

module.exports = create = (options, callback = (->)) ->
  {rootPath, skeleton} = options
  uriRe = /(?:https?|git(hub)?|gh)(?::\/\/|@)/

  fs_utils.exists (sysPath.join rootPath, 'package.json'), (exists) ->
    if exists
      return logger.error "Directory '#{rootPath}' is already an npm project"
    isGitUri = skeleton and uriRe.test skeleton
    get = if isGitUri then cloneSkeleton else copySkeleton
    get skeleton, rootPath, callback
