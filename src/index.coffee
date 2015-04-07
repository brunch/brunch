'use strict'

initSkeleton = require 'init-skeleton'
loggy = require 'loggy'
watch = require './watch'

start = ->
  isDebug = arguments[1]?.debug or arguments[2]?.debug
  process.env.DEBUG = 'brunch:*' if isDebug
  watch arguments...

module.exports =
  new: (skeleton, path) ->
    initSkeleton skeleton, {
      rootPath: path,
      commandName: 'brunch new',
      logger: loggy
    }
  build: start.bind null, false
  watch: start.bind null, true
