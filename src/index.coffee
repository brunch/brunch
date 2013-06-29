'use strict'

initSkeleton = require 'init-skeleton'
sysPath = require 'path'
watch = require './watch'
logger = require 'loggy'

create = (skeleton, path = '.') ->
  unless skeleton
    logger.error '''
  You must specify skeleton (boilerplate) from which brunch will initialize
  new application.

  You can specify directory on disk, Git URL or GitHub url (gh:user/repo).

  Some suggestions:

  * `gh:brunch/dead-simple` if you want no opinions. Just initializes configs and empty directories.
  * `gh:paulmillr/brunch-with-chaplin`: Brunch with Chaplin (Backbone, Chaplin, CoffeeScript). The most popular skeleton

  All other skeletons (40+) are available at
  http://git.io/skeletons
    '''
    return
  initSkeleton skeleton, path

module.exports = {
  new: create
  build: watch.bind(null, false)
  watch: watch.bind(null, true)
}
