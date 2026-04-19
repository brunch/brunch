View = require './view'
template = require './templates/todo'

module.exports = class TodoView extends View
  template: template
  tagName: 'li'

  events:
    'click .check': 'toggleDone'
    'dblclick .todo-content': 'edit'
    'click .todo-destroy': 'clear'
    'keypress .todo-input': 'updateOnEnter'

  initialize: ->
    @model.bind 'change', @render
    @model.view = this

  getRenderData: ->
    {
      todo: @model.toJSON()
    }

  afterRender: ->
    @$('.todo-input').bind 'blur', @update

  toggleDone: ->
    @model.toggle()

  edit: ->
    @$el.addClass 'editing'
    $('.todo-input').focus()

  update: =>
    @model.save content: @$('.todo-input').val()
    @$el.removeClass 'editing'

  updateOnEnter: (event) ->
    @update() if event.keyCode is 13

  remove: ->
    @$el.remove()

  clear: ->
    @model.clear()
