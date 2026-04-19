"use strict";

var $ = require('jquery');
var count = 0;

var App = {
  items: ['Learn Brunch', 'Apply to my projects', '…', 'Profit!'],

  init: function init() {
    var tmpl = require('views/list');
    var html = tmpl({ items: App.items });
    $('body').append(html);

    $.each(App.items, function(i, item) { requestItem(item); });
  }
};

function requestItem(item) {
  $.ajax('/items', {
    type: 'post',
    data: { title: item },
    success: function(res) {
      console.log('Successfully posted entry “' + item + '”: ' + res);

      if (++count === App.items.length) {
        $.getJSON('/items', function(res) {
          console.log('Successfully fetched back entries:', res);
        });
      }
    }
  });
}

module.exports = App;
