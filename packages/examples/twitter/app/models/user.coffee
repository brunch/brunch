mediator = require 'mediator'
Model = require 'models/base/model'

module.exports = class User extends Model
  initialize: ->
    super
    @subscribeEvent 'userMethods', @initializeMethods

  # twttr.anywhere has many useful methods like isFollowedBy()
  # so it's great to have them in the model.
  initializeMethods: (methods) =>
    Object.keys(methods)
      .filter (method) =>
        not this[method]
      .forEach (method) =>
        @[method] = methods[method]
