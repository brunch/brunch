# Brunch
Brunch is lightweight client side framework on top of backbone, eco and
stylus using coffee-script.

## Installation
You'll need [node.js](http://nodejs.org/) 0.4.x and [npm](http://npmjs.org/).
Type:

    npm install -g brunch

## Getting Started
Create a new project by
 
    brunch new
 
Then you can start the file watcher. It will compile your .coffee, .styl and
.eco files on the fly after every change so you don't have to do it manually.
 
    brunch watch
 
Open `brunch/index.html` and see you first running brunch application.

## Standing on the Shoulders of Giants
Instead of reinventing the wheel, brunch assembles awesome wheels.

- [CoffeeScript](http://jashkenas.github.com/coffee-script/)
- [Stitch](https://github.com/sstephenson/stitch)
- [Backbone](http://documentcloud.github.com/backbone/)
- [Underscore](http://documentcloud.github.com/underscore/)
- [jQuery](http://jquery.com/) or [Zepto](http://zeptojs.com/)
- [Stylus](https://github.com/LearnBoost/stylus)
- [Eco](https://github.com/sstephenson/eco)
- [Jasmine](http://pivotal.github.com/jasmine/)

## Contributing ![build status](https://secure.travis-ci.org/brunch/brunch.png?branch=master)
Install dependencies to `node_modules` directory

```bash
cake setup
```

Install brunch in your local npm repository

```bash
cake install
```

and run test suite via

```bash
cake test
```

## Contact
- Website: [brunch.io](http://brunch.io).
- Project twitter: [@brunch](http://twitter.com/brunch)
- Google+ page: [Brunch](https://plus.google.com/103222632910810384455).
- IRC: #brunch @ Freenode

## License
Brunch is released under the MIT License (see LICENSE for details).
