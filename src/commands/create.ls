{exec} = require 'child_process'
mkdirp = require 'mkdirp'
rimraf = require 'rimraf'
sys-path = require 'path'
helpers = require '../helpers'
logger = require '../logger'
fs_utils = require '../fs_utils'

# Remove git metadata and run npm install.
remove-and-install = (root-path, callback) ->
  rimraf (sys-path.join root-path, '.git'), (error) ->
    return logger.error error if error?
    helpers.install root-path, callback

module.exports = create = (options, callback = (->)) ->
  if options.template
    logger.warn "--template is deprecated. Use --skeleton."
    options.skeleton = options.template
  {root-path, skeleton} = options

  copy-skeleton = (skeleton-path) ->
    skeleton-dir = sys-path.join __dirname, '..' '..' 'skeletons'
    skeleton-path ?= sys-path.join skeleton-dir, 'simple-coffee'
    logger.debug "Copying skeleton from #skeleton-path"

    copy-directory = (from) ->
      fs_utils.copy-if-exists from, root-path, no, (error) ->
        return logger.error error if error?
        logger.info 'Created brunch directory layout'
        remove-and-install root-path, callback

    mkdirp root-path, 0o755, (error) ->
      return logger.error error if error?
      fs_utils.exists skeleton-path, (exists) ->
        return logger.error "Skeleton '#skeleton' doesn't exist" unless exists
        copy-directory skeleton-path

  clone-skeleton = (URL) ->
    logger.debug "Cloning skeleton from git URL #{URL}"
    exec "git clone #URL #root-path", (error, stdout, stderr) ->
      return logger.error "Git clone error: #{stderr.to-string!}" if error?
      logger.info 'Created brunch directory layout'
      remove-and-install root-path, callback

  fs_utils.exists root-path, (exists) ->
    return logger.error "Directory '#root-path' already exists" if exists
    if /(https?|git)(:\/\/|@)/.test skeleton
      clone-skeleton skeleton, callback
    else
      copy-skeleton skeleton, callback
