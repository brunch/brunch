mediator = require 'mediator'
utils = require 'chaplin/lib/utils'

# Application-specific view helpers
# ---------------------------------

# http://handlebarsjs.com/#helpers

# Conditional evaluation
# ----------------------

# Choose block by user login status
Handlebars.registerHelper 'if_logged_in', (options) ->
  if mediator.user
    options.fn(this)
  else
    options.inverse(this)

# Map helpers
# -----------

# Make 'with' behave a little more mustachey
Handlebars.registerHelper 'with', (context, options) ->
  if not context or Handlebars.Utils.isEmpty context
    options.inverse(this)
  else
    options.fn(context)

# Inverse for 'with'
Handlebars.registerHelper 'without', (context, options) ->
  inverse = options.inverse
  options.inverse = options.fn
  options.fn = inverse
  Handlebars.helpers.with.call(this, context, options)

# Evaluate block with context being current user
Handlebars.registerHelper 'with_user', (options) ->
  context = mediator.user or {}
  Handlebars.helpers.with.call(this, context, options)

Handlebars.registerHelper 'transform_if_retweeted', (options) ->
  if this.retweeted_status
    data = _.clone(this.retweeted_status)
    data.retweeter = this.user
    options.fn(data)
  else
    options.fn(this)

Handlebars.registerHelper 'auto_link', (options) ->
  new Handlebars.SafeString twttr.txt.autoLink options.fn this

Handlebars.registerHelper 'format_date', (options) ->
  date = new Date options.fn this
  new Handlebars.SafeString moment(date).fromNow()

Handlebars.registerHelper 'unless_is_web', (source, options) ->
  string = if source is 'web' then '' else options.fn this
  new Handlebars.SafeString string
