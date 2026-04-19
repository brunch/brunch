describe 'app.views.todo_view',
  beforeEach ->
    {TodoView} = require 'views/todo_view'
    window.location.hash = ''
    app.initialize()
    Backbone.history.loadUrl()
    @todo = app.todoList.create()
    @view = new TodoView model: @todo

  afterEach ->
    localStorage.clear()

  it 'should initialize view', ->
    expect 2
    ok @view.model._callbacks.change
    ok @view.model.view

  it 'should render view', ->
    expect 2
    el = @view.render().el
    equals $(el).find('.todo-input').length, 1
    ok $(el).find('.todo-input').data("events").blur
