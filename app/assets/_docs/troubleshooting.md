# Brunch: Troubleshooting

<div class="toc-placeholder"></div>

<a name="emfile"></a>

## I get an EMFILE error when I build a Brunch project

`EMFILE` means there are too many open files.
Brunch watches all your project files and it's usually a pretty big number.
You can fix this error with setting max opened file count to a bigger number
using the command `ulimit -n <number>` (10000 should be enough).

## My module is not included after changing sometimes

If you are running `brunch watch` and change something, to later find out that the changed file was included as completely *empty*... what do you do?

It is caused by the way some editors write to files.
It also can happen when you edit files over ssh.
You can see these threads for more details:

* [brunch/brunch#1250](https://github.com/brunch/brunch/issues/1250)
* [brunch/brunch#1219](https://github.com/brunch/brunch/issues/1219)
* [brunch/brunch#1303](https://github.com/brunch/brunch/issues/1303)

Here's a quick summary on how to fix this:

* see if there are write-related configuration options in your editor. In Sublime, `atomic_save: true` seems to do the trick.

* try add this to your config:

  ```js
  watcher: {
    awaitWriteFinish: true,
    usePolling: true
  }
  ```

## I experience another issue

See our [contributing guideline](https://github.com/brunch/brunch/blob/master/CONTRIBUTING.md#did-you-find-a-bug) on how to debug and report issues. Don't forget to search GitHub issues to see if similar has already been reported, resolved, or fixed.
