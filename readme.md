brunch is lightweight client side framework on top of backbone, eco and stylus using coffee-script

## How to Install

you can get brunch using the node package manager (npm 1.0+)

    npm install brunch -g

## Getting Started

Create a new project by

    brunch new

To get started easily, brunch ships with a small express app. To install express into your local directory use

    npm install express

Then you can start the file watcher. It will compile your .coffee, .styl and .eco files on the fly after every change so you don't have to do it manually.

    brunch watch

visit `localhost:8080` and see you first running brunch application

## Documentation

for more information ckeck out [brunchwithcoffee.com](http://brunchwithcoffee.com)

## Standing on the Shoulders of Giants

Instead of reinventing the wheel, brunch assembles awesome wheels.

* [CoffeeScript](http://jashkenas.github.com/coffee-script/)
* [Stitch](https://github.com/sstephenson/stitch)
* [Backbone](http://documentcloud.github.com/backbone/)
* [Underscore](http://documentcloud.github.com/underscore/)
* [jQuery](http://jquery.com/) or [Zepto](http://zeptojs.com/)
* [Stylus](https://github.com/LearnBoost/stylus)
* [Eco](https://github.com/sstephenson/eco)

## Development

Install dependencies to `node_modules` directory

    cake setup

Install brunch in your local npm repository

    cake install

Watch coffeescript files and continously compile them via

    cake watch

and run test suite via

    cake test

## Contact

Feel free to contact us at Freenode #brunch in the IRC client of your choice.

## Future plans

* add phonegap support
