exports.config =
  debug: on
  # Uncomment and edit the next line to change default build path.
  # buildPath: 'public'

  # Edit this to change extension & content of files, used by
  # `brunch generate` / `brunch destroy`.
  extensions:
    javascript: 'coffee'
    stylesheet: 'styl'
    template: 'eco'

  # Defines how to compile app files.
  # Example:
  #   javascripts: {'vendor.js': /^vendor/}
  # will compile all scripts which are located in `vendor/`
  # to separate file ('vendor.js').
  join:
    javascripts:
      'javascripts/app.js': /^app/
      'javascripts/vendor.js': /^vendor/
    stylesheets: 'stylesheets/app.css'
    templates: 'javascripts/app.js'

  # Defines compilation order.
  # `vendor` files will be compiled before other ones
  # even if they are not present here.
  order:
    javascripts:
      before: [
        'vendor/scripts/console-helper.js',
        'vendor/scripts/jquery-1.7.js',
        'vendor/scripts/underscore-1.3.1.js',
        'vendor/scripts/backbone-0.9.0.js',
      ]
    stylesheets:
      before: ['vendor/styles/normalize.css']
      after: ['vendor/styles/helpers.css']
