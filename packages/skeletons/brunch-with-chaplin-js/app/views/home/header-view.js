var View = require('views/base/view');

module.exports = View.extend({
  autoRender: true,
  className: 'header',
  tagName: 'header',
  template: require('./templates/header')
});
