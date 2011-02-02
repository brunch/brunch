window.app = {}
app.controllers = {}
app.models = {}
app.views = {}
window.module = {} # dirty workaround until eco's namespace is fixed

# app bootstrapping on document ready
$(document).ready ->
  Backbone.history.saveLocation("!/home") if '' == Backbone.history.getFragment()
  Backbone.history.start()