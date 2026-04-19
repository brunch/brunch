mediator = require 'mediator'
View = require 'views/base/view'
StatsView = require 'views/stats_view'
StatusView = require 'views/status_view'
template = require 'views/templates/sidebar'

module.exports = class SidebarView extends View
  template: template

  id: 'sidebar'
  container: '#sidebar-container'
  autoRender: true

  initialize: ->
    super
    @subscribeEvent 'loginStatus', @loginStatusHandler
    @subscribeEvent 'userData', @render

  loginStatusHandler: (loggedIn) =>
    @model = if loggedIn then mediator.user else null
    @render()

  render: ->
    super
    @subview 'status', new StatusView container: @$('#status-container')
    @subview 'stats', new StatsView container: @$('#stats-container')
    ['status', 'stats'].forEach (name) =>
      @subview(name).render()
