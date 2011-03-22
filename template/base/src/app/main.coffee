window.app = {}
app.controllers = {}
app.models = {}
app.collections = {}
app.views = {}
app.templates = {}

# app bootstrapping on document ready
$(document).ready ->
  app.initialize = ->
    app.controllers.main = new MainController()
    app.views.home = new HomeView()
    Backbone.history.saveLocation("home") if Backbone.history.getFragment() is ''
  app.initialize()
  Backbone.history.start()
