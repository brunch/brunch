Model = require './model'

module.exports = class Todo extends Model
  defaults:
    content: 'Empty todo...'
    done: no

  toggle: ->
    @save done: not @get 'done'

  clear: ->
    @destroy()
    @view.remove()
