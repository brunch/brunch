# Contributing to Brunch

### Did you find a bug?

First, **make sure it was not already reported** by taking a look at the currently open [Issues on GitHub](https://github.com/brunch/brunch/issues).

If nothing resembling what you are experiencing was reported, feel free to [open a new issue](https://github.com/brunch/brunch/issues/new).
Make sure your description of the issue is clear and contains as much relevant information as possible.
The issue will be handled more quickly if it includes a link to a sample repo that demonstrates incorrect behavior.

We never ask you to share your private, possibly NDA'd, application with us.
Just create a tiny application that includes a resembling config as well as just enough code to reproduce the issue.A


### Do you want to write a patch yourself?

#### The Process

* Open a new Pull Request with the patch.
* Clearly describe what is being fixed. If possible, reference a bug report or a feature request.
* Update the docs if the new functionality is added.

#### Brunch internals overview

Brunch, the tool, is split across several modules:

* [brunch/brunch](https://github.com/brunch/brunch) is the main repo.
  It ties everything together to provide the build tool you'll love.
  Generally, if something doesn't fit into the other repos, it goes here.

* [brunch/init-skeleton](https://github.com/brunch/init-skeleton) helps you create new Brunch apps.
  It uses the list of skeletons from [brunch/skeletons](https://github.com/brunch/skeletons)

Some more:

* [paulmillr/loggy](https://github.com/paulmillr/loggy) is a lightweight logging library.
* [paulmillr/chokidar](https://github.com/paulmillr/chokidar) is behind Brunch's file watching magic.
* [paulmillr/pushserver](https://github.com/paulmillr/pushserve) is the default HTTP server.

Where the documentation lives:

* [brunch/brunch.github.io](https://github.com/brunch/brunch.github.io/tree/source/app/assets/_docs)
* [brunch/brunch-guide](https://github.com/brunch/brunch-guide)

#### How to set up the dev env

It won't make much sense to blindly edit the Brunch's sources and get no feedback on whether you are heading in the right direction.
If you are making changes, you most likely are either a) fixing a bug, or b) adding a feature — in both of which cases you probably already have a sample app.

To use your local fork of Brunch, as you need to do is:

1. run `npm link` in the Brunch fork directory. This will make your fork the globally available Brunch on your system.
2. run `npm link brunch` in your sample application. This will make `node_modules/brunch` in your app a symlink to your Brunch fork.

Additionally, if your changes span past `brunch/brunch`, you will also need to:

1. run `npm link` from the forked module.
2. run `npm link <module name>` from the Brunch fork directory to link it to Brunch.
