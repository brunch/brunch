module.exports = (match) ->
  match 'logout', 'login#logout'
  match '', 'tweets#index'
  match '@:user', 'user#show'
