Chaplin = require 'chaplin'
SiteView = require 'views/site-view'

module.exports = class Controller extends Chaplin.Controller
  # Reusabilities persist stuff between controllers.
  # You may also persist models etc.
  beforeAction: ->
    @reuse 'site', SiteView
