# Brunch Skeletons [![Build Status](https://travis-ci.org/brunch/skeletons.svg?branch=master)](https://travis-ci.org/brunch/skeletons)

This is a registry of Brunch skeletons. Human-readable version: http://brunch.io/skeletons

## Adding your skeleton

Simply edit `skeletons.json` file and add a new entry *to the top of the file, but below official Brunch skeletons*:

```json
{
  "title": "Brunch with Exim",
  "url": "hellyeahllc/with-exim",
  "alias": "exim",
  "technologies": "Babel, ES6, React, Exim",
  "description": "Very useful for Cordova apps. A simple skeleton that uses HTML5 boilerplate, React and Exim framework."
}
```

* **Title** &mdash; Simple and concise title of your skeleton.
* **URL** &mdash; Git URL. For GitHub repos, `github.com/user/repo` can be shortened to `user/repo`.
* **Alias** &mdash; a short alias, so users would be able to use `brunch new -s alias` instead of specifying full Git URL.
