Application = require 'application'
routes = require 'routes'

# Initialize the application on DOM ready event.
$ ->
  new Application {
    title: 'Brunch example application',
    controllerSuffix: '-controller',
    routes
  }
