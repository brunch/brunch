'use strict'

initSkeleton = require 'init-skeleton'
sysPath = require 'path'
watch = require './watch'

defaultSkeleton = sysPath.join(
  __dirname, '..', 'skeletons', 'brunch-with-chaplin'
)

create = (skeleton = defaultSkeleton, path = '.') ->
  initSkeleton skeleton, path

module.exports = {
  new: create
  build: watch.bind(null, false)
  watch: watch.bind(null, true)
}
