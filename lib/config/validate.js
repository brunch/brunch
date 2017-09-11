'use strict';
const j = require('./joi-ext');
const sysPath = require('universal-path');
const defaultIgnored = require('./ignored');

const entryPoints = j.object().pattern(/$/, j.string());
const joinTo = j.alt(j.hash(j.anymatch()), j.string());

const schema = j.obj({
  paths: j.obj({
    root: j.string().default('.'),
    public: j.string().default('public'),
    watched: j.set(j.string()).default(['app', 'test']),
  }),

  files: j.obj({
    javascripts: j.obj({
      entryPoints,
      vendor: joinTo,
    }),
    stylesheets: j.obj({
      entryPoints,
      vendor: joinTo,
      joinTo,
      order: {
        before: j.anymatch().default(() => false),
        after: j.anymatch().default(() => false),
      },
    }).nand('entryPoints', 'joinTo')
      .with('order', 'joinTo'),
  }),

  npm: j.obj({
    aliases: j.hash(j.string()),
    styles: j.hash(
      j.set(j.string())
    ),
    compilers: j.alt(
      j.hash(j.anymatch()),
      j.set(j.string())
    ).default({}),
  }),

  plugins: j.hash(j.obj()).keys({
    on: j.set(j.string()),
    off: j.set(j.string()),
    only: j.set(j.string()),
  }),

  conventions: j.obj({
    ignored: j.anymatch().default(/\/_/),
    assets: j.anymatch().default(/assets\//),
    vendor: j.anymatch().default(/node_modules\//),
  }),

  notifications: j.alt(
    j.boolean(),
    j.obj({
      app: j.string(),
      icon: j.string(),
      levels: j.set(j.string()),
      notify: j.func().maxArity(1),
    })
  ).default(true),

  optimize: j.boolean().default(false),
  sourceMaps: j.alt(
    'absoluteUrl',
    'inline',
    j.boolean()
  ).default(true),

  server: j.obj({
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
    config: j.obj(),
  }).nand('path', 'command'),
  // public path??

  watcher: j.obj({
    ignored: j.anymatch().default(defaultIgnored),
    usePolling: j.boolean(),
    interval: j.int(),
    binaryInterval: j.int(),
    useFsEvents: j.boolean(),
    alwaysStat: j.boolean(),
    depth: j.int(),
    awaitWriteFinish: j.alt(
      j.boolean(),
      j.obj({
        stabilityThreshold: j.int(),
        pollInterval: j.int(),
      })
    ),
    ignorePermissionErrors: j.boolean(),
    atomic: j.boolean(),
  }).with('interval', 'usePolling')
    .with('binaryInterval', 'usePolling'),

  hooks: j.obj({
    preCompile: j.func().maxArity(1).default(() => {}),
    onCompile: j.func().maxArity(2).default(() => {}),
    teardown: j.func().maxArity(0).default(() => {}),
  }),

  fileListInterval: j.int().default(65),

  env: j.set(j.string()),
  overrides: j.hash(
    j.lazy(() => {
      return schema
        .forbiddenKeys('overrides')
        .options({noDefaults: true});
    })
  ),
});

module.exports = config => {
  const {error, value} = j.validate(config, schema, {
    abortEarly: false,
    // convert: false,
  });

  if (error) throw error;

  return value;
};
