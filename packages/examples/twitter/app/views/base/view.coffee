Chaplin = require 'chaplin'
require 'lib/view_helper' # Just load the view helpers, no return value

module.exports = class View extends Chaplin.View
  # Precompiled templates function initializer.
  getTemplateFunction: ->
    @template
