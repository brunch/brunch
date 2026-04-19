View = require './view'
TodoView = require './todo_view'
application = require 'application'
template = require './templates/todos'

module.exports = class TodosView extends View
  template: template
  id: 'todos-view'

  addOne: (todo) =>
    view = new TodoView model: todo
    @$el.find('#todos').append view.render().el

  addAll: =>
    # TODO explain why this is working - see underscore source
    application.todos.each @addOne

  initialize: ->
    application.todos.bind 'add', @addOne
    application.todos.bind 'reset', @addAll
    application.todos.bind 'all', @renderStats

  renderStats: =>
    application.statsView.render()
