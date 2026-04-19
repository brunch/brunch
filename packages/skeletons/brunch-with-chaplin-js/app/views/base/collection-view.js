var Chaplin = require('chaplin');
var View = require('./view');

module.exports = Chaplin.CollectionView.extend({
  // This class doesn’t inherit from the application-specific View class,
  // so we need to borrow the method from the View prototype:
  getTemplateFunction: View.prototype.getTemplateFunction
});
