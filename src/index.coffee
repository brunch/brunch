'use strict'

initSkeleton = require 'init-skeleton'

start = ->
  process.env.DEBUG = 'brunch:*' if arguments[1]?.debug
  (require './watch').apply null, arguments

module.exports = {
  new: (skeleton, path) ->
    initSkeleton.commandName = 'brunch new'
    initSkeleton skeleton, path
  build: start.bind(null, false)
  watch: start.bind(null, true)
}
