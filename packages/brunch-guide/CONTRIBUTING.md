# Contributing to the Brunch.io guide

So you want to contribute to this guide?  Hey, that's **awesome**! :tada:  Welcome aboard!

## Types of contribution

We welcome any and all types of contributions, with a particular eye towards the following:

  * Typo's
  * Bug fixes
  * Rewording for clearer explanations and general content
  * Extra content and example code (and possibly images to go with that)
  * Translations

## Workflow

This is GitHub, my friends, so let's do it the clean way:

  1. Fork this repo
  2. Work on your own fork
  3. Clean up your local history so it reads nicely.  If you don't know how to do that, [check this out](https://medium.com/@porteneuve/getting-solid-at-git-rebase-vs-merge-4fa1a48c53aa#541c).  Seize the opportunity to proofread everything.
  4. Push the clean history to your repo (if you had pushed earlier, it's okay to **force-push**; if that bothers you, create a new branch over the clean history and push it fresh).
  5. Create a **Pull Request** towards this repo's `master` branch.  Craft a nice title and description so I get a good sense of what you were doing in there.

Do *not* touch `CONTRIBUTING.md` (this file): I'll add your name after I merge your PR.

Don't know Git?  Or GitHub?  Afraid to do all this?  Then at the very least [file an issue](http://github.com/brunch/brunch-guide/issues)!  Try and be as descriptive as possible, and if you have a notion of how to fix that thing, let us know, too!

## Coding style

Open source means "your house, your rules" when it comes to code.  In your fixes **and translations**, please follow the same coding standards as the original code.  It's pretty much in sync with the community's dominant style, which mostly boils down to:

  * Two-space indent
  * Comma last
  * Opening curly at the end of line
  * Always use curlies on blocks, even single-statement ones
  * Comments on their own lines, before the commented code, using `//` markers
  * Spaces around binary operators and after colons, commas and semicolons
  * No spaces inside parentheses, or between function name and opening paren.

I also require an empty line after a short-circuit (`return`, `break`, `continue`) and no `else` for an `if` that ends with a short-circuit.

## About translations

Translations should:

  * Use a `l10n-<iso3166-2 locale code>` branch on their fork to contain their work
  * Put their chapters inside `content/<locale>/`, including their `README.md`
  * Put any custom images (you shouldn't need that, but who knows) in an `images/` subdirectory alongside their own content
  * Add a link to their `README.md` with their language's name (in their own language) in the "Translations" section of the root `README.md`
  * Keep an English-language link to the main `README.md` at the top of their own (see [this file](content/fr/README.md) for the markup line you can reuse)

Before submitting your translated PR, you should also:

  * Have proofread it yourself entirely (post-writing),
  * Have created a PR local to your repo (from `l10n-<locale>` to `master`, for instance) to bring in at least one extra reviewer that would proofread your translation too.
  * Have closed that PR to show the dual review is done.

You can then create a PR to this repo's `master`.  This whole process is fairly common on GitHub for translations, and is designed to ensure a good minimum level of translation quality.

If you want to link to another demo repo, this is fine.  Please name it `brunch-guide-demo-<locale>`, and notify me in your PR so I can link to it from the original repo's README as well.

## Contributors

This section lists contributors to this repository.

* [Christophe Porteneuve](https://github.com/tdd) (original guide, EN and FR)
* [Elan Shanker](https://github.com/es128) (review & fine-tuning, official merge)
* [Paul Miller](https://github.com/paulmillr) (review & fine-tuning, official merge)
* [List of All Contributors](https://github.com/brunch/brunch-guide/graphs/contributors)
