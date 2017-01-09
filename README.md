# Brunch

[![Build Status](https://travis-ci.org/brunch/brunch.svg?branch=master)](https://travis-ci.org/brunch/brunch)
[![Join the chat at https://gitter.im/brunch/brunch](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/brunch/brunch?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM](https://nodei.co/npm/brunch.png?compact=true)](https://nodei.co/npm/brunch/)
[![NPM](https://nodei.co/npm-dl/brunch.png)](https://nodei.co/npm/brunch/)

> HTML5 applications made easy.

Fast front-end web app build tool with simple declarative config, seamless incremental compilation for rapid development, an opinionated pipeline and workflow, and core support for source maps

## First steps

Install Brunch with a simple node.js package manager command: `npm install -g brunch`

1. **Create** a new Brunch project: `brunch new [--skeleton url]`
    - skeleton specifies a skeleton from which your application will be initialized.
    The default skeleton (dead-simple) doesn't have any opinions about frameworks or libraries.
    - [brunch.io/skeletons](http://brunch.io/skeletons) contains over 50
    boilerplate projects, which you can use to init your app from.
2. **Develop** with Brunch: `brunch watch --server`
    - tells Brunch to watch your project and incrementally rebuild it when source files are changed.
    The optional server flag launches a simple web server with push state support.
    - If you use OS X and want brunch to show system notification every time compilation error happens, you will need to install terminal notifier:
    `brew install terminal-notifier`
3. **Deploy** with Brunch: `brunch build --production`
    - builds a project for distribution. By default it enables minification.

## Learn

* Visit [**brunch.io**](http://brunch.io)
* Read [**brunch docs**](http://brunch.io/docs/getting-started)
* Follow us on Twitter: [@brunch](http://twitter.com/brunch)
* Ask questions on Stack Overflow with [#brunch](http://stackoverflow.com/questions/tagged/brunch) tag

## Contributing

See the [CONTRIBUTING.md](https://github.com/brunch/brunch/blob/master/CONTRIBUTING.md) document for more info on how to file issues or get your head into the Brunch's internals.

- To install edge version (from GitHub `master` branch): `npm install -g brunch/brunch`
- To enable debug mode, simply pass `-d` flag to any command like that: `brunch build -d`
- To create your own plugin, check out our [plugin boilerplate](https://github.com/brunch/brunch-boilerplate-plugin) as a starting point.

## License

Brunch is released under the MIT License.

Copyright (c) 2011-2016 Paul Miller, Elan Shanker, Nik Graf,
Thomas Schranz, Allan Berger, Jan Monschke, Martin Schürrer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
