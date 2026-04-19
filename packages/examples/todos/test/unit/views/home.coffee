describe 'app.views.home_view',
  beforeEach ->
    window.location.hash = "home"
    app.initialize()
    Backbone.history.loadUrl()
  afterEach ->
    localStorage.clear()

  test 'render subviews', ->
    expect 3
    el = app.views.home.render().el
    equals $(el).find('#new-todo-view').length, 1
    equals $(el).find('#todos-view').length, 1
    equals $(el).find('#stats-view').length, 1
