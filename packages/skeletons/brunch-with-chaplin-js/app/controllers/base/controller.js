var Chaplin = require('chaplin');
var SiteView = require('views/site-view');

module.exports = Chaplin.Controller.extend({
  // Compositions persist stuff between controllers.
  // You may also persist models etc.
  beforeAction: function() {
    return this.reuse('site', SiteView);
  }
});
