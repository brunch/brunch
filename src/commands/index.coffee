create = require './create'
scaffold = require './scaffold'
watch = require './watch'

module.exports = {
  new: create
  build: watch.bind(null, no)
  watch: watch.bind(null, yes)
  generate: scaffold.bind(null, no)
  destroy: scaffold.bind(null, yes)
}
