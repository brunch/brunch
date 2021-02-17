# Brunch [![Weekly downloads](https://img.shields.io/npm/dw/brunch.svg)](https://www.npmjs.com/package/brunch) [![Yearly downloads](https://img.shields.io/npm/dy/brunch.svg)](https://www.npmjs.com/package/brunch)

> Web applications made easy. Since 2011.

Fast front-end web app build tool with simple declarative config and seamless incremental compilation for rapid development.

## Usage

Install Brunch with a simple node.js package manager command:

    npm install -g brunch

1. **Create** a new Brunch project: `brunch new [--skeleton url]`
    - skeleton specifies a skeleton from which your application will be initialized.
    The default skeleton (dead-simple) doesn't have any opinions about frameworks or libraries.
    - [brunch.io/skeletons](https://brunch.io/skeletons) contains over 50
    boilerplate projects, which you can use to init your app from.
2. **Develop** with Brunch: `brunch watch --server`
    - tells Brunch to watch your project and incrementally rebuild it when source files are changed.
    The optional server flag launches a simple web server with push state support.
3. **Deploy** with Brunch: `brunch build --production`
    - builds a project for distribution. By default it enables minification.

## Learn

- Visit [**brunch.io**](https://brunch.io)
- Read [**brunch docs**](https://brunch.io/docs/getting-started)
- Follow us on Twitter: [@brunch](https://twitter.com/brunch)
- Ask questions on Stack Overflow with [#brunch](https://stackoverflow.com/questions/tagged/brunch) tag

## Contributing

See the [CONTRIBUTING.md](https://github.com/brunch/brunch/blob/master/CONTRIBUTING.md) document for more info on how to file issues or get your head into the Brunch's internals.

- To install edge version (from GitHub `master` branch): `npm install -g brunch/brunch`
- To enable debug mode, simply pass `-d` flag to any command like that: `brunch build -d`
- To create your own plugin, check out our [plugin boilerplate](https://github.com/brunch/brunch-boilerplate-plugin) as a starting point.

## License

MIT license (c) 2021 Paul Miller [paulmillr.com](https://paulmillr.com), Elan Shanker,
Nik Graf, Thomas Schranz, Allan Berger, Jan Monschke, Martin Schürrer

See LICENSE file.
