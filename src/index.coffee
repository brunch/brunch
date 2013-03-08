'use strict'

initSkeleton = require 'init-skeleton'
scaffolt = require 'scaffolt'
sysPath = require 'path'
watch = require './commands/watch'
test = require './commands/test'

create = (options) ->
  options.skeleton ?= sysPath.join(__dirname, '..', 'skeletons', 'brunch-with-chaplin')
  initSkeleton options.skeleton, (options.rootPath ? '.')

brunchScaffold = (revert, options) ->
  options.revert = revert
  options.parentPath = options.parentDir
  scaffolt options.type, options.name, options

module.exports = {
  new: create
  build: watch.bind(null, no)
  watch: watch.bind(null, yes)
  generate: brunchScaffold.bind(null, no)
  destroy: brunchScaffold.bind(null, yes)
  test: test
}
