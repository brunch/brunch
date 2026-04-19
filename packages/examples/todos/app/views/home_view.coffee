View = require './view'
application = require 'application'
template = require './templates/home'

module.exports = class HomeView extends View
  template: template
  el: '#home-view'

  afterRender: ->
    $todo =  @$el.find('#todo-app')
    for viewName in ['newTodo', 'todos', 'stats']
      $todo.append application["#{viewName}View"].render().el
