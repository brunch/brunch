{BrunchApplication} = require 'helpers'
{MainRouter} = require 'routers/main_router'
{HomeView} = require 'views/home_view'

class exports.Application extends BrunchApplication
  # This callback would be executed on document ready event.
  initialize: ->
    @router = new MainRouter
    @homeView = new HomeView

window.app = new exports.Application
