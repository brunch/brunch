'use strict'

initSkeleton = require 'init-skeleton'
sysPath = require 'path'
watch = require './watch'
logger = require 'loggy'

module.exports = {
  new: (skeleton, path) ->
    initSkeleton.commandName = 'brunch new'
    initSkeleton skeleton, path
  build: watch.bind(null, false)
  watch: watch.bind(null, true)
}
