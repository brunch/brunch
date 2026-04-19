View = require 'views/base/view'
template = require 'views/templates/navigation'

module.exports = class NavigationView extends View
  # This is a workaround.
  # In the end you might want to used precompiled templates.
  template: template

  id: 'navigation'
  container: '#navigation-container'
  autoRender: true

  initialize: ->
    super
    @subscribeEvent 'loginStatus', @render
    @subscribeEvent 'startupController', @render
