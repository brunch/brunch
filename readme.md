Early alpha, please use with caution!

brunch is an opinionated client side framework on top of backbone.js, eco, stylus using coffee-script.

## How to Install

you can get brunch using the node package manager

    npm install brunch

## How to Use

create a new project using 'proj' as app namespace

    brunch new <proj>

start the file watcher to process all .coffee, .sass or .html file changes automatically

    brunch watch

build the project

    brunch build

brunch provides the possibility to choose between different project templates
currently these are available

* express (default) - includes build in express server which will be started with "brunch watch"
* base - just the basic brunch layout including src, config and build

you can choose between them via option "--projectTemplate"

    brunch new my_app --projectTemplate base

## TODO

* documentation, documentation und documentation!!!!!!!
* move js files from src to build
* move watch to own node package or at least to another file
* proper error message if brunch directory already exist
* proper output info
* tests!!!!!!!
