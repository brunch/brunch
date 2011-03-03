class MainController extends Backbone.Controller
  routes :
    "home": "home"

  constructor: ->
    super

  home: ->
    app.views.home.render()
