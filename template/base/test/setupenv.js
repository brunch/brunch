// Inject _ and Backbone globals to simulate browser environment.

global._ = require(__dirname + '/../src/vendor/underscore-1.1.7');
global.Backbone = require(__dirname + '/../src/vendor/backbone-0.5.3');


// Uncomment the following line to include jquery. Note that this requires the
// node.js version of jquery, which pulls in all the dependencies required to
// run jquery on node.

//global.$ = global.jQuery = require('jquery');
