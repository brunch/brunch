var View = require('views/base/view');

module.exports = View.extend({
  autoRender: true,
  className: 'home-page',
  template: require('./templates/home')
});
