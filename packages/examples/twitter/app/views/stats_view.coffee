mediator = require 'mediator'
View = require 'views/base/view'
template = require 'views/templates/stats'

module.exports = class StatsView extends View
  template: template
  className: 'stats'
  tagName: 'ul'

  initialize: ->
    super
    @subscribeEvent 'loginStatus', @loginStatusHandler
    @subscribeEvent 'userData', @render
    @model = if mediator.user then mediator.user else null

  loginStatusHandler: (loggedIn) =>
    @model = if loggedIn then mediator.user else null
    @render()
