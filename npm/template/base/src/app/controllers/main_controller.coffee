class MainController extends Backbone.Controller
  routes :
    "!/home": "home"

  constructor: ->
    super

  home: ->
    app.views.home.render()

# init controller
app.controllers.main = new MainController()