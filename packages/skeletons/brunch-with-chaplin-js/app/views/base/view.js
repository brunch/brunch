var Chaplin = require('chaplin');
require('lib/view-helper');

module.exports = Chaplin.View.extend({
  // Allow passing `template` to View constructor so it will be saved
  // as a property on an instance.
  optionNames: Chaplin.View.prototype.optionNames.concat(['template']),

  getTemplateFunction: function(){
    return this.template;
  }
});
