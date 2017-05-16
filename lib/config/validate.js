'use strict';
const logger = require('loggy');
const BrunchError = require('../error');
const j = require('./joi-ext');
const sysPath = require('universal-path');
const defaultIgnored = require('./ignored');

const entryPoints = j.hash(j.string());
const vendor = j.compile([
  j.string(),
  j.hash(j.anymatch()),
]);

const schema = j.object({
  paths: j.object({
    root: j.string().default('.'),
    public: j.string().default('public'),
    watched: j.set(j.string()).default(['app', 'test']),
    packageConfig: j.string().default('package.json'),
  }).default(),

  files: j.object({
    javascripts: j.object({
      entryPoints,
      vendor,
    }).default(),
    stylesheets: j.object({
      entryPoints,
      vendor,
      joinTo: vendor,
      order: j.object({
        before: j.anymatch().default([]),
        after: j.anymatch().default([]),
      }).default(),
    }).default()
      .nand('joinTo', 'entryPoints')
      .with('joinTo', 'order'),
  }).default(),

  npm: j.object({
    aliases: j.hash(j.string()),
    styles: j.hash(j.set(j.string())),
    compilers: [
      j.set(j.string()),
      j.hash(j.set(j.string())),
    ],
  }).default(),

  plugins: j.object({
    on: j.set(j.string()),
    off: j.set(j.string()),
    only: j.set(j.string()),
  }).default(),

  conventions: j.object({
    ignored: j.anymatch().default(/\/_/),
    assets: j.anymatch().default(/assets\//),
    vendor: j.anymatch().default(/node_modules\//),
  }).default(),

  notifications: j.compile([
    j.boolean(),
    j.object({
      app: j.string(),
      icon: j.string(),
      levels: j.set(j.string()),
      notify: j.func().maxArity(1),
    }),
  ]).default(true),

  optimize: j.boolean().default(false),
  sourceMaps: j.compile([
    j.boolean(),
    'absoluteUrl',
    'inline',
  ]).default(true),

  server: j.object({
    run: j.boolean().default(false),
    base: j.string().default(''),
    port: j.number().integer().default(3333),
    hostname: j.string().default('localhost'),
    indexPath: j.string().default('index.html'),
    startupLogging: j.boolean().default(true),
    noPushState: j.boolean().default(false),
    noCors: j.boolean().default(false),
    stripSlashes: j.boolean().default(false),
    path: j.string().default(sysPath.resolve('brunch-server')),
    command: j.string(),
    config: j.object().default(),
  }).default().nand('path', 'command'),
  // public path??

  watcher: j.object({
    ignored: j.anymatch().default(defaultIgnored),
    usePolling: j.boolean(),
    interval: j.number().integer(),
    binaryInterval: j.number().integer(),
    useFsEvents: j.boolean(),
    alwaysStat: j.boolean(),
    depth: j.number().integer(),
    awaitWriteFinish: j.compile([
      j.boolean(),
      j.object({
        stabilityThreshold: j.number().integer(),
        pollInterval: j.number().integer(),
      }),
    ]),
    ignorePermissionErrors: j.boolean(),
    atomic: j.boolean(),
  }).default()
    .with('interval', 'usePolling')
    .with('binaryInterval', 'usePolling'),

  hooks: j.object({
    preCompile: j.func().maxArity(0).default(() => {}),
    onCompile: j.func().maxArity(2).default(() => {}),
    teardown: j.func().maxArity(0).default(() => {}),
  }).default(),

  fileListInterval: j.number().integer().default(65),
  plugins: j.hash(j.object()),

  envs: j.set(j.string()),
  overrides: j.lazy(() => {
    return j.hash(schema.forbiddenKeys('overrides'));
  }),

  // bowerConfig: v.deprecated(v.noop, 'bower support was removed'),
  // static: j.array().items(j.string()).default([]),
  // modules: v.deprecated(v.object, 'was removed'),
  // hot: v.deprecated(v.noop, 'moved to `config.plugins.hmr`'),
  // bower: v.deprecated(v.noop, 'bower support was removed'),
  // preCompile: v.deprecated(v.function, 'moved to `config.hooks.preCompile`'),
  // onCompile: v.deprecated(v.function, 'moved to `config.hooks.onCompile`'),
}).default();

const options = {
  abortEarly: false,
  convert: false,
};

module.exports = config => {
  const {error, value} = j.validate(config, schema, options);
  return value;
};
