template = require 'views/templates/tweet'
View = require 'views/base/view'

module.exports = class TweetView extends View
  template: template
  className: 'tweet'
