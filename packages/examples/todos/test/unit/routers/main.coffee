describe 'main router', ->
  beforeEach ->
    window.location.hash = "home"
    app.initialize()

  afterEach ->
    localStorage.clear()

  describe 'home route', ->
    it 'should work', (done) ->
      # stub methods of home view and todos
      app.views.home =
        render: done
      app.collections.todos =
        fetch: done
      Backbone.history.loadUrl()
