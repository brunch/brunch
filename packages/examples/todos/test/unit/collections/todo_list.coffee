describe 'TodoList collection', ->
  beforeEach ->
    app.initialize()
    todoList = app.todoList

  afterEach ->
    localStorage.clear()
    
  it 'should check for initialized localstorage', ->
    expect(typeof todoList.localStorage).to.equal 'object'
    
  it 'should get done todos', ->
    todoList.create done: yes, content: 'first'
    todoList.create done: no, content: 'second'
    (expect todoList.done().length).to.equal 1
    (expect todoList.done()[0].get 'content').to.equal 'first'
    
  it 'should get remaining todos', ->
    todoList.create done: yes, content: 'first'
    todoList.create done: no, content: 'second'
    (expect todoList.remaining().length).to.equal 1
    (expect todoList.remaining()[0].get 'content').to.equal 'second'

  it '#nextOrder() should return next list entry position', ->
    expect(todoList.nextOrder()).to.equal 1
    todoList.create order: 1
    (expect todoList.nextOrder()).to.equal 2

  it 'should check order', ->
    todoList.create content: 'first', order: 2
    todoList.create content: 'second', order: 1
    (expect todoList.models[0].get('content')).to.equal 'second'
    (expect todoList.models[1].get('content')).to.equal 'first'

  it 'should clear all todos', ->
    todoList.create done: yes, content: 'first'
    todoList.create done: no, content: 'second'
    todoList.clearCompleted()
    (expect todoList.length).to.equal 1
    (expect todoList.models[0].get 'content').to.equal 'second'
