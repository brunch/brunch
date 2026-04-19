Chaplin = require 'chaplin'
# Application-specific utilities
# ------------------------------

# Delegate to Chaplin’s utils module.
utils = Chaplin.utils.beget Chaplin.utils

# _.extend utils,
#  someMethod: ->

# Prevent creating new properties and stuff.
Object.seal? utils

module.exports = utils
