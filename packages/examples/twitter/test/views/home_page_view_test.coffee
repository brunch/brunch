HomePageView = require 'views/home_page_view'

describe 'HomePageView', ->
  beforeEach ->
    @view = new HomePageView()

  afterEach ->
    @view.dispose()

  it 'should auto-render', ->
    expect(@view.$el.find 'img').to.have.length 1
