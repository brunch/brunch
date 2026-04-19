$ = require('jquery')
route = require('page')

window.include = (page) -> require("pages/#{page}")()

startRouter = (onRoute) ->
  document.addEventListener 'DOMContentLoaded', ->
    route '*', (url, next) ->
      missed = false

      # Determine view.
      page = try
        include url.path
      catch
        missed = true
        include 'index'
      body = $(document.body)
      if missed
        body.fadeOut 150, ->
          body.html(page)
          body.fadeIn(150)
      else
        body.html(page)
      onRoute url, page, missed
    route()

startRouter (url, page) ->
  # Custom page logic goes here.
