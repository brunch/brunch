var Chaplin = require('chaplin');
module.exports = Chaplin.Model.extend({
  // Mixin a synchronization state machine.
  // initialize: function() {
  //   _.extend(this, Chaplin.SyncMachine);
  //   Chaplin.Model.prototype.apply(this, arguments);
  //   this.on('request', this.beginSync);
  //   this.on('sync', this.finishSync);
  //   this.on('error', this.unsync);
  // }

  // Place your application-specific model features here
});
