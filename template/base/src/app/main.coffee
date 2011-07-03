window.app = {}
app.controllers = {}
app.models = {}
app.collections = {}
app.views = {}

MainRouter = require('controllers/main_controller').MainRouter
HomeView = require('views/home_view').HomeView

# app bootstrapping on document ready
$(document).ready ->
  app.initialize = ->
    app.controllers.main = new MainRouter()
    app.views.home = new HomeView()
    Backbone.history.saveLocation("home") if Backbone.history.getFragment() is ''
  app.initialize()
  Backbone.history.start()
