class exports.BrunchApplication
  constructor: ->
    $ =>
      @initialize this
      Backbone.history.start()

  initialize: ->
    null
