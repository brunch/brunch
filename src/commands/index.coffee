'use strict'

create = require './create'
scaffold = require './scaffold'
watch = require './watch'
test = require './test'

module.exports = {
  new: create
  build: watch.bind(null, no)
  watch: watch.bind(null, yes)
  generate: scaffold.bind(null, no)
  destroy: scaffold.bind(null, yes)
  test: test
}
