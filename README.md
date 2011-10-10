brunch is lightweight client side framework on top of backbone, eco and stylus using coffee-script

## How to Install

you can get brunch using the node package manager (npm 1.0+)

    npm install brunch -g

## Getting Started

Create a new project by
 
    brunch new
 
Then you can start the file watcher. It will compile your .coffee, .styl and .eco files on the fly after every change so you don't have to do it manually.
 
    brunch watch
 
Open `brunch/index.html` and see you first running brunch application.

## Documentation

For more information check out [brunch.io](http://brunch.io)

## Standing on the Shoulders of Giants

Instead of reinventing the wheel, brunch assembles awesome wheels.

* [CoffeeScript](http://jashkenas.github.com/coffee-script/)
* [Stitch](https://github.com/sstephenson/stitch)
* [Backbone](http://documentcloud.github.com/backbone/)
* [Underscore](http://documentcloud.github.com/underscore/)
* [jQuery](http://jquery.com/) or [Zepto](http://zeptojs.com/)
* [Stylus](https://github.com/LearnBoost/stylus)
* [Eco](https://github.com/sstephenson/eco)
* [Jasmine](http://pivotal.github.com/jasmine/)

## Development

Install dependencies to `node_modules` directory

    cake setup

Install brunch in your local npm repository

    cake install

and run test suite via

    cake test

## Contact

Feel free to contact us at Freenode #brunch in the IRC client of your choice.
