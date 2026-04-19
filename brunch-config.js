'use strict';

const nav = [
  {title: 'Home', path: ''},
  {title: 'Docs', path: 'docs/getting-started', activeOn: 'docs/'},
  {title: 'Plugins', path: 'plugins'},
  {title: 'Skeletons', path: 'skeletons'},
  {title: 'In Production', path: 'examples'},
  {title: 'GitHub', path: 'https://github.com/brunch/brunch'},
];

const docSidebar = [
  {section: 'Quick Start', items: [
    {title: 'Getting started', path: 'getting-started'},
    {title: 'Core concepts', path: 'concepts'},
    {title: 'Why Brunch', path: 'why-brunch'},
    {title: 'Using plugins', path: 'using-plugins'},
    {title: 'Using JS modules and NPM', path: 'using-modules'},
    {title: 'Testing', path: 'testing'},
    {title: 'Deploying', path: 'deploying'},
  ]},
  {section: 'Reference', items: [
    {title: 'Commands', path: 'commands'},
    {title: 'Config', path: 'config'},
    {title: 'Plugin API', path: 'plugins'},
    {title: 'Troubleshooting', path: 'troubleshooting'},
    {title: 'Architecture', path: 'architecture'},
    {title: 'Changelog', link: 'https://github.com/brunch/brunch/blob/master/CHANGELOG.md'},
  ]},
  {section: 'Community Resources', items: [
    {title: 'The Brunch Guide', link: 'https://github.com/brunch/brunch-guide'},
  ]},
];

const social = [
  {
    classname: 'github',
    width: 160,
    src: 'http://ghbtns.com/github-btn.html?user=brunch&repo=brunch&type=watch&count=true&size=large',
  }, {
    classname: 'twitter',
    width: 260,
    src: 'https://platform.twitter.com/widgets/follow_button.html?screen_name=brunch&show_count=true&size=l',
  },
];

exports.files = {
  javascripts: {joinTo: 'app.js'},
  stylesheets: {joinTo: 'app.css'},
};
exports.npm = {
  globals: {
    // FIXME: Do not use globals
    Inferno: 'inferno',
    createElement: 'inferno-create-element',
  },
};
exports.plugins = {
  babel: {
    presets: ['es2015'],
    plugins: ['inferno', 'transform-object-rest-spread'],
  },
  jade: {
    locals: {nav, social, docSidebar},
  },
  autoReload: {
    enabled: {css: true, js: false, assets: true},
  },
  postcss: {
    processors: [
      require('autoprefixer')({
        browsers: ['last 2 versions'],
      }),
    ],
  }
};
