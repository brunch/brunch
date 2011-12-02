{BrunchApplication} = require 'helpers'


class exports.Application extends BrunchApplication
  # This callback would be executed on document ready event.
  onReady: ->
    {MainRouter} = require 'routers/main_router'
    {HomeView} = require 'views/home_view'
    @routers.main = new MainRouter
    @views.home = new HomeView
    Backbone.history.start()


window.app = new exports.Application
