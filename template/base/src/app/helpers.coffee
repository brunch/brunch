class exports.BrunchApplication
  constructor: ->
    @routers = {}
    @models = {}
    @collections = {}
    @views = {}
    @utils = {}
    jQuery =>
      @onReady @

  onReady: -> null
