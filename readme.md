brunch is lightweight client side framework on top of backbone, eco and stylus using coffee-script

## How to Install

you can get brunch using the node package manager

    npm install brunch

## Getting Started

Create a new project by

    brunch new

Then you can start the file watcher. It will compile your .coffee, .styl and .eco files on the fly after every change so you don't have to do it manually.

    brunch watch

visit `localhost:8080` and see you first running brunch application

## Documentation

for more information ckeck out [brunchwithcoffee.com](http://brunchwithcoffee.com)

## Standing on the Shoulders of Giants

Instead of reinventing the wheel, brunch assembles awesome wheels.

* [CoffeeScript](http://jashkenas.github.com/coffee-script/)
* [Backbone](http://documentcloud.github.com/backbone/)
* [Underscore](http://documentcloud.github.com/underscore/)
* [jQuery](http://jquery.com/) or [Zepto](http://zeptojs.com/)
* [Stylus](https://github.com/LearnBoost/stylus)
* [Eco](https://github.com/sstephenson/eco)

## Development

Watch coffeescript files and compile them via

    cake watch

and run tests via

    cake test

## Contact

Feel free to contact us at Freenode #brunch in the IRC client of your choice.

## TODO

* more & improved documentation
* add collections folder
* fix bug (dispatch is called multiple times)
* directly call stylus instead of spawning child process
* copy css files to build
* add possibility to use zepto instead of jquery

## Future plans

* add phonegap support
