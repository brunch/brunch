class exports.MainController extends Backbone.Controller
  routes :
    "home": "home"

  constructor: ->
    super

  home: ->
    console.log "a"
    $('body').html app.views.home.render().el
