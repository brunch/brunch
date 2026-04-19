Handlebars.registerHelper 'pluralize', (count, fn) ->
  string = fn()
  pluralized = if count is 1
    string
  else
    "#{string}s"
  new Handlebars.SafeString pluralized
