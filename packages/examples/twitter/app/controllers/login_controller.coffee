Controller = require 'controllers/base/controller'

module.exports = class LoginsController extends Controller
  logout: ->
    @publishEvent '!logout'
    @publishEvent '!router:route', '/'
