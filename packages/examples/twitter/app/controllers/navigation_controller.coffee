Controller = require 'controllers/base/controller'
Navigation = require 'models/navigation'
NavigationView = require 'views/navigation_view'

module.exports = class NavigationController extends Controller
  historyURL: 'logout'

  initialize: ->
    super
    @model = new Navigation
    @view = new NavigationView {@model}
