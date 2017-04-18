#!/bin/bash

npm install -g brunch bower

cd ~/code

brunch new brunch-babel-es6 -s https://github.com/brunch/with-es6
( cd ~/code/brunch-babel-es6 ; brunch build )

brunch new brunch-exim-react -s https://github.com/hellyeahllc/brunch-with-exim
( cd ~/code/brunch-exim-react ; brunch build )

brunch new brunch-chaplin -s https://github.com/paulmillr/brunch-with-chaplin
( cd ~/code/brunch-chaplin ; brunch build )
