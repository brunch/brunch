Controller = require 'controllers/base/controller'
SidebarView = require 'views/sidebar_view'
StatusView = require 'views/status_view'

module.exports = class SidebarController extends Controller
  initialize: ->
    @view = new SidebarView()
