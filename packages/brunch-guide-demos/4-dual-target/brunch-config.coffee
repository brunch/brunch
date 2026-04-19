module.exports = config:
  files:
    javascripts: joinTo:
      'libraries.js': /^app[\\\/]jquery\.js/
      'app.js': /^(?!app[\\\/]jquery\.js)/
    stylesheets: joinTo: 'app.css'
