'use strict'

initSkeleton = require 'init-skeleton'
sysPath = require 'path'
watch = require './watch'

create = (skeleton, path) ->
  skeleton ?= sysPath.join(__dirname, '..', 'skeletons', 'brunch-with-chaplin')
  path ?= '.'
  console.log 'a', skeleton, path
  initSkeleton skeleton, path

module.exports = {
  new: create
  build: watch.bind(null, no)
  watch: watch.bind(null, yes)
}
