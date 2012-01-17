class exports.MainRouter extends Backbone.Router
  routes:
    '': 'home'

  home: ->
    $('body').html app.homeView.render().el
