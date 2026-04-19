mediator = require 'mediator'
Model = require 'models/base/model'

module.exports = class Status extends Model
  minLength: 1
  maxLength: 140

  validate: (attributes) ->
    text = attributes.text
    if (not text) or (text.length < @minLength) or (text.length > @maxLength)
      return 'Invalid text'

  calcCharCount: (value) ->
    @maxLength - value

  sync: (method, model, options) ->
    provider = mediator.user.get('provider')
    timeout = setTimeout options.error.bind(options, 'Timeout error'), 4000
    provider.T.Status.update model.get('text'), (tweet) =>
      window.clearTimeout(timeout)
      @publishEvent 'tweet:add', tweet.attributes
      options.success(tweet.attributes)
    return
