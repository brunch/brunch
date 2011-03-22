class MainController extends Backbone.Controller
  routes :
    "home": "home"

  constructor: ->
    super

  home: ->
    $('body').html app.views.home.render().el
