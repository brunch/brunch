exports.conventions =
  ignored: /^app\/styles\/(?!index\.styl)/

mirrorPublic = false
if mirrorPublic
  exports.conventions.assets = /^app\/public[\\\/]/

exports.files =
  javascripts: joinTo:
    'javascripts/app.js': /^app/
    'javascripts/vendor.js': /^(?!app)/
  stylesheets: joinTo:
    'stylesheets/app.css': /^app/
    'stylesheets/vendor.css': /^(?!app)/
  templates: joinTo: 'javascripts/app.js'

exports.plugins =
  postcss:
    processors: [ require('autoprefixer') ]
