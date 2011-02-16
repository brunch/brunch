window.app = {}
app.controllers = {}
app.models = {}
app.views = {}

# app bootstrapping on document ready
$(document).ready ->
  # init controller
  app.controllers.main = new MainController()

  Backbone.history.saveLocation("home") if '' == Backbone.history.getFragment()
  Backbone.history.start()
