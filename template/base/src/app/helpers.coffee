class exports.BrunchApplication
  constructor: ->
    @routers = {}
    @models = {}
    @collections = {}
    @views = {}
    @utils = {}
    jQuery =>
      @onReady this

  onReady: -> null
