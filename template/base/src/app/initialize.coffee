{BrunchApplication} = require "helpers"


class exports.Application extends BrunchApplication
  # This callback would be executed on document ready event.
  onReady: ->
    @routers.main = new (require("routers/main_router").MainRouter)
    @views.home = new (require("views/home_view").HomeView)
    # http://documentcloud.github.com/backbone/#Router-navigate
    if Backbone.history.getFragment() is ""
      Backbone.history.navigate("home", yes)


window.app = new exports.Application
