application = require 'application'

module.exports = class Router extends Backbone.Router
  routes:
    '': 'home'

  home: ->
    application.homeView.render()
    application.todos.fetch()
