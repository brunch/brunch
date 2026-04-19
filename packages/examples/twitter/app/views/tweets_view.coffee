mediator = require 'mediator'
CollectionView = require 'views/base/collection_view'
TweetView = require 'views/tweet_view'
template = require 'views/templates/tweets'

module.exports = class TweetsView extends CollectionView
  template: template

  tagName: 'div' # This is not directly a list but contains a list
  id: 'tweets'

  itemView: TweetView
  container: '#content-container'
  listSelector: '.tweets' # Append the item views to this element
  fallbackSelector: '.fallback'

  initialize: ->
    super # Will render the list itself and all items
    @subscribeEvent 'loginStatus', @showHideLoginNote

  # Show/hide a login appeal if not logged in
  showHideLoginNote: ->
    display = (if mediator.user then 'block' else 'none')
    @$('.tweets, .tweets-header').css 'display', display

  render: ->
    super
    console.log 'Render'
    @showHideLoginNote()
