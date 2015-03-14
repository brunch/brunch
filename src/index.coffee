'use strict'

initSkeleton = require 'init-skeleton'

start = ->
  isDebug = arguments[1]?.debug or arguments[2]?.debug
  process.env.DEBUG = 'brunch:*' if isDebug
  (require './watch').apply null, arguments

module.exports = {
  new: (skeleton, path) ->
    initSkeleton.commandName = 'brunch new'
    initSkeleton skeleton, path
  build: start.bind(null, false)
  watch: start.bind(null, true)
}
