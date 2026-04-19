# Brunch: Architecture

Below is a schema which shows the order of function calls inside brunch while it bundles stuff.

* Function names in schema are the same as in the source code, so you can easily search by names in sources.
* Schema starts from function `watch` which you can find in `lib/watch.js`.
* Linked things are underlined by the same color.
* Phrases in quotes are relative to the debug mode output.

You can start brunch with debug mode by adding `d` flag, for example: `brunch build -d`<br/>
Be sure to check out brunch commands [here](http://brunch.io/docs/commands).

[![Brunch architecture schema][brunch-inside]][brunch-inside]

<!-- References -->

[brunch-inside]: ./../images/schema/brunch-inside.jpg
