# Nitrous Brunch Quickstart

This `nitrous.readme.md` file contains instructions on how to use the Nitrous [Quickstart](https://www.nitrous.io/quickstarts/) feature with this project.

Quickstarts allow you to create an out of the box development environment on Nitrous in just a few minutes; without having to perform the expected setup or configuration beforehand.

## How to Use

All that's required is a [Nitrous.io account](https://www.nitrous.io) and that your are signed in to this account with your web browser when you click the Quickstart trigger button below.

Click the button to begin the process once signed in:

[![Nitrous Quickstart](https://nitrous-image-icons.s3.amazonaws.com/quickstart.svg)](https://www.nitrous.io/quickstart?repo=https://github.com/brunch/brunch)

> The Quick Start setup process will take several minutes to complete.

After the process completes you are redirected to your new Brunch development environnment on Nitrous. An environment that's ready to use and build Brunch web applications from the get go.

## Brunch Development on Nitrous

>See the Brunch [documentation](https://github.com/brunch/brunch-guide), [readme](https://github.com/brunch/brunch/blob/master/README.md), and [official website](http://brunch.io/) for directions on how to develop Brunch apps in detail.

There are some aspects of development specific to Nitrous that you should be aware of whilst using the platform.

The first is that all test/preview server processes need to be run on the host address `0.0.0.0` - instead of the usual `localhost` or `127.0.0.1` addresses. The process must also be run on an open port number, which is `3000` on this Brunch Quickstart template.  

So for each and any Brunch apps you want to preview you'll need to add this next function to your main Brunch configuration file:

```javascript
server: {
 hostname: '0.0.0.0',
 port: '3000'
},
```

Real examples of this function being added to `brunch-config.js` and `brunch-config.coffee` are shown in the later steps of [this Nitrous Guide on Brunch](https://community.nitrous.io/tutorials/getting-started-with-brunch).

This Quickstart template for Brunch also has several in-built "Run" functions that work as shortcuts to launching an app's preview server (once configured with the above).

1 - Click the "Start Working Directory's Brunch Server" option (whilst inside a Brunch project) from the "Run" tab to start the server process.

![Nitrous Run Menu](http://i.imgur.com/tS4yWvL.png)

2 - Then click the "Preview" tab and "Port 3000" to see the application running in your browser.

![Nitrous App Preview](http://i.imgur.com/KQHm6qN.png)

As long as the server setting described earlier is included in the main config file, this should work as intended.

Lastly on a separate note - please bear in mind that the Nitrous platform is intended primarily for use as a development environment, and not to function as a live production solution.

## Brunch Quickstart Sample Projects

There are three Brunch sample projects pre-installed onto this template, with all of their dependencies included. These are there for you to test, preview, or use for your own development should you wish to.

These projects must also be configured to run on the correct hostname and port before attempting to Preview them on Nitrous (discussed above).

1. `brunch-babel-es6` - a simple project that includes Babel/ES6 support as part of the template: [https://github.com/brunch/with-es6](https://github.com/brunch/with-es6)
2. `brunch-exim-react` - provides the basis for a Brunch app that uses Exim and React as part of the development: [https://github.com/hellyemhllc/brunch-with-exim](https://github.com/hellyeahllc/brunch-with-exim)
3. `brunch-chaplin` - example skeleton for creating Brunch web apps with the [Chaplin](http://chaplinjs.org/) framework: [https://github.com/paulmillr/brunch-with-chaplin](https://github.com/paulmillr/brunch-with-chaplin)

To preview one of these sample projects at any time or place, click the relevant "Start Server" option from the "Run" tab to launch, then click the "Preview" tab and "Port 3000" to see the application running in your browser.

## More Help

* [Getting Started with Brunch Tutorial on Nitrous](https://community.nitrous.io/tutorials/getting-started-with-brunch) - Begin at step **"3 - Create a Basic Brunch Project"**.
* [Previewing Your App on Nitrous](https://community.nitrous.io/docs/preview-your-app) - Context on the server preview configuration.
* [Nitrous Documentation](https://community.nitrous.io/docs) - General and specific topics.
