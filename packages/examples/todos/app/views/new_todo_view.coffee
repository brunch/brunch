View = require './view'
application = require 'application'
template = require './templates/new_todo'

module.exports = class NewTodoView extends View
  template: template
  id: 'new-todo-view'
  events:
    'keypress #new-todo': 'createOnEnter'
    'keyup #new-todo': 'showHint'

  newAttributes: ->
    attributes =
      order: application.todos.nextOrder()
    attributes.content = @$('#new-todo').val() if @$('#new-todo').val()
    attributes

  createOnEnter: (event) ->
    return unless event.keyCode is 13
    application.todos.create @newAttributes()
    @$('#new-todo').val ''

  showHint: (event) ->
    tooltip = @$('.ui-tooltip-top')
    input = @$('#new-todo')
    tooltip.fadeOut()
    clearTimeout @tooltipTimeout if @tooltipTimeout
    return if input.val() is '' or  input.val() is input.attr 'placeholder'
    @tooltipTimeout = setTimeout (-> tooltip.fadeIn()), 1000
