class exports.MainRouter extends Backbone.Controller
  routes :
    "home": "home"

  home: ->
    $('body').html app.views.home.render().el
