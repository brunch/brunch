class exports.BrunchApplication
  constructor: ->
    @routers = {}
    @models = {}
    @collections = {}
    @views = {}
    @utils = {}
    jQuery =>
      @initialize this
      Backbone.history.start()

  initialize: ->
    null
