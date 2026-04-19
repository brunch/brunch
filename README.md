# Brunch [![Weekly downloads](https://img.shields.io/npm/dw/brunch.svg)](https://www.npmjs.com/package/brunch) [![Yearly downloads](https://img.shields.io/npm/dy/brunch.svg)](https://www.npmjs.com/package/brunch)

> Web applications made easy. Since 2011.

Fast front-end web app build tool with simple declarative config and seamless incremental compilation for rapid development.

## ⚠️ Deprecation Notice

**This `brunch` NPM package is deprecated and has been transferred to a new owner.**

### What happened?

This package was previously maintained by [@paulmillr](https://github.com/paulmillr). Due to low usage and a request from a third party who wanted to use the package name for their own project, ownership has been transferred.

**I have no affiliation with the new owner or their software.**

### Security Warning 🔐

This is important: future versions of this package will be published by a **different author for a completely unrelated purpose**. This means:

- You should **not** assume future versions are safe to upgrade to without review.
- If you have this package as a dependency, **pin to the last version published by the original author** (see below).
- Blindly running `npm update` or `npm install` in the future could pull in software from an unknown third party.

This is not a reflection on the new owner's intentions — it is simply good security hygiene when a package changes hands entirely.

### What you should do

1. **Check if you actually depend on this package.** Run:
   ```sh
   npm ls brunch
   ```

2. **If you do depend on it**, pin to the last safe version in your `package.json`:
   ```json
   "brunch": "4.0.2"
   ```

3. **Migrate away** if possible. This package will not receive any further updates from the original author.

### Last safe versions

These versions are considered safe:

    npm install -g brunch@1.7.20
    npm install -g brunch@1.8.5
    npm install -g brunch@2.10.17
    npm install -g brunch@3.0.0
    npm install -g brunch@4.0.2

To verify integrity, sha256 checksums:

```
eb4f81d7797f60158a9cf11120e34fbae4720aff23a8379ce7b5d27eba3d04b0  brunch-1.7.20.tgz
5e58be14c4c2fe4fed1be12ad0e781f60f16bae67dc034a3b4e3d0d43d579a7a  brunch-1.8.5.tgz
620be47e542d828cf78166a8bc3bbf803f95d6309a5163cd8a18d76320ddba95  brunch-2.10.17.tgz
56aee6d89805acab17e53179d470b2c1a59c8ed24ade7b3e67ff3af2c5ba3b68  brunch-2.10.9.tgz
179bdbb0d33aafcc2aa7067107ad73effbe94aef09744e08a3b5f530228aa9e3  brunch-3.0.0.tgz
af179ebc33d22e7b5af4b61e498ad0e8f5f6edcf3190aea0ed33d19d26b9286e  brunch-4.0.2.tgz
```

---

*Thank you to everyone who used this package. Stay safe out there.*

## Learn

- Visit [**brunch.github.io**](https://brunch.github.io)
- Read [**brunch docs**](https://brunch.github.io/docs/getting-started)
- Follow us on Twitter: [@brunch](https://twitter.com/brunch)
- Ask questions on Stack Overflow with [#brunch](https://stackoverflow.com/questions/tagged/brunch) tag

## Usage

1. **Create** a new Brunch project: `brunch new [--skeleton url]`
    - skeleton specifies a skeleton from which your application will be initialized.
    The default skeleton (dead-simple) doesn't have any opinions about frameworks or libraries.
    - [brunch.github.io/skeletons](https://brunch.github.io/skeletons) contains over 50
    boilerplate projects, which you can use to init your app from.
2. **Develop** with Brunch: `brunch watch --server`
    - tells Brunch to watch your project and incrementally rebuild it when source files are changed.
    The optional server flag launches a simple web server with push state support.
3. **Deploy** with Brunch: `brunch build --production`
    - builds a project for distribution. By default it enables minification.

## Contributing

See the [CONTRIBUTING.md](https://github.com/brunch/brunch/blob/master/CONTRIBUTING.md) document for more info on how to file issues or get your head into the Brunch's internals.

- To install edge version (from GitHub `master` branch): `npm install -g brunch/brunch`
- To enable debug mode, simply pass `-d` flag to any command like that: `brunch build -d`
- To create your own plugin, check out our [plugin boilerplate](https://github.com/brunch/brunch-boilerplate-plugin) as a starting point.

## License

MIT license (c) 2021 Paul Miller [paulmillr.com](https://paulmillr.com), Elan Shanker,
Nik Graf, Thomas Schranz, Allan Berger, Jan Monschke, Martin Schürrer

See LICENSE file.
