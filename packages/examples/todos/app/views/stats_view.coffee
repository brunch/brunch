View = require './view'
application = require 'application'
template = require './templates/stats'

module.exports = class StatsView extends View
  template: template
  id: 'stats-view'
  events:
    'click .todo-clear' : 'clearCompleted'

  getRenderData: ->
    {
      stats:
        total: application.todos.length
        done: application.todos.done().length
        remaining: application.todos.remaining().length
    }

  clearCompleted: ->
    application.todos.clearCompleted()
