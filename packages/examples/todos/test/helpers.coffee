this.testHelpers =
  keydown: (keyCode, selector) ->
    e = $.Event "keypress"
    e.keyCode = keyCode
    $(selector).trigger('focus').trigger e

  createTodo: (content = 'bring out the garbage') ->
    $('#new-todo').val content
    testHelpers.keydown $.ui.keyCode.ENTER, '#new-todo'
