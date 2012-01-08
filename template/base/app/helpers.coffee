class exports.BrunchApplication
  constructor: ->
    jQuery =>
      @initialize this
      Backbone.history.start()

  initialize: ->
    null
