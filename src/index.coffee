'use strict'

initSkeleton = require 'init-skeleton'
watch = require './watch'

module.exports = {
  new: (skeleton, path) ->
    initSkeleton.commandName = 'brunch new'
    initSkeleton skeleton, path
  build: watch.bind(null, false)
  watch: watch.bind(null, true)
}
