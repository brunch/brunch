# Brunch: Deploying

<p>
  Brunch-generated applications are a bunch of simple static files. You can
  host them everywhere, even on free hostings, like
  <a href="http://help.github.com/pages/">GitHub pages</a>.

  Because production environments are usually
  slightly different than development envs,
  brunch has <code>production</code> option.
</p>

<p>To build application that has minified JS and CSS, execute <code>brunch build --production</code>. Then you can deploy it:</p>

<ul>
  <li>
    If you use <strong>static hosting site</strong>: build your application
    on your machine and just upload <code>public/</code>
    directory to the directory that is served by a webserver.
  </li>
  <li>
    If you use <strong>hosting that supports Node.js</strong>, you can
    install brunch there and auto-build app every time.
  </li>
  <li>
    If you prefer <a href="http://heroku.com/">Heroku</a>,
    there is <a href="https://gist.github.com/3596447">a nice small guide</a>
    on deploying.
    Should work even on free instances.
  </li>
  <li>
    If you’re into
    <a href="http://help.github.com/pages/">GitHub pages</a>,
    you’ll need to build your app,
    move <code>public/</code> directory to somewhere,
    <a href="http://git-scm.com/book/en/Git-Branching-Basic-Branching-and-Merging">switch to <code>gh-pages</code>
    git branch</a>,
    remove files from directory and move files from your temporary
    dir here.
  </li>
  <li>
    If you use 
    <a href="http://www.layer0.co/">Layer0</a>,
    follow the
    <a href="https://docs.layer0.co/guides/brunch">official guide</a>.
  </li>
</ul>
