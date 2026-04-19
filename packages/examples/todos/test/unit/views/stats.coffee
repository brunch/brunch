describe 'app.views.stats_view',
  beforeEach ->
    window.location.hash = "home"
    app.initialize()
    Backbone.history.loadUrl()
  afterEach ->
    localStorage.clear()

  test 'render view', ->
    expect 1
    app.todoList.create()
    el = app.views.stats.render().el
    equals $(el).find('.todo-count').length, 1

  test 'clear completed ', ->
    expect 1
    app.todoList.clearCompleted = ->
      ok true
    app.views.stats.clearCompleted()
