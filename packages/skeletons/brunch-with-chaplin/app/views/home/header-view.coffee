View = require 'views/base/view'

module.exports = class HeaderView extends View
  autoRender: true
  className: 'header'
  tagName: 'header'
  template: require './templates/header'
