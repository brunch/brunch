'use strict'

initSkeleton = require 'init-skeleton'
loggy = require 'loggy'

hasDebug = (obj) ->
  obj and typeof obj is 'object' and obj.debug

start = (args...) ->
  isDebug = hasDebug(args[1]) or hasDebug(args[2])
  process.env.DEBUG = 'brunch:*' if isDebug
  fn = require('./watch')
  fn args...

module.exports =
  new: (skeleton, path) ->
    initSkeleton skeleton, {
      rootPath: path,
      commandName: 'brunch new',
      logger: loggy
    }
  build: start.bind null, false
  watch: start.bind null, true
