describe 'app.models.Todo', ->
  todo = {}

  beforeEach: ->
    app.initialize()
    @todo = app.todoList.create()

  afterEach: ->
    localStorage.clear()
    @todo = {}

  it 'todo defaults', ->
    (expect @todo.get('done')).to.not.be.ok()
    (expect @todo.get('content')).to.equal 'empty todo...'

  it 'todo toggle', ->
    @todo.toggle()
    (expect @todo.get 'done').to.be.ok()
    @todo.toggle()
    (expect @todo.get 'done').to.not.be.ok()

  it 'todo clear', ->
    view =
      remove: ->
        ok true
    @todo.view = view
    @todo.clear()
    (expect app.todoList.length).to.equal 0
