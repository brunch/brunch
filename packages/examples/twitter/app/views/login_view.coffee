utils = require 'lib/utils'
View = require 'views/base/view'
template = require 'views/templates/login'

module.exports = class LoginView extends View
  template: template
  id: 'login'
  container: '#content-container'
  autoRender: true

  # Expects the serviceProviders in the options
  initialize: (options) ->
    super
    @initButtons options.serviceProviders

  # In this project we currently only have one service provider and therefore
  # one button. But this should allow for different service providers.
  initButtons: (serviceProviders) ->
    for serviceProviderName, serviceProvider of serviceProviders
      buttonSelector = ".#{serviceProviderName}"
      @$(buttonSelector).addClass('service-loading')

      loginHandler = _(@loginWith).bind(
        this, serviceProviderName, serviceProvider
      )
      @delegate 'click', buttonSelector, loginHandler

      loaded = _(@serviceProviderLoaded).bind(
        this, serviceProviderName, serviceProvider
      )
      serviceProvider.done loaded

      failed = _(@serviceProviderFailed).bind(
        this, serviceProviderName, serviceProvider
      )
      serviceProvider.fail failed

  loginWith: (serviceProviderName, serviceProvider, event) ->
    event.preventDefault()
    return unless serviceProvider.isLoaded()
    @publishEvent 'login:pickService', serviceProviderName
    @publishEvent '!login', serviceProviderName

  serviceProviderLoaded: (serviceProviderName) ->
    return if @disposed
    @$(".#{serviceProviderName}").removeClass('service-loading')

  serviceProviderFailed: (serviceProviderName) ->
    return if @disposed
    @$(".#{serviceProviderName}")
      .removeClass('service-loading')
      .addClass('service-unavailable')
      .attr('disabled', true)
      .attr('title', "Error connecting. Please check whether you are
blocking #{utils.upcase(serviceProviderName)}.")
