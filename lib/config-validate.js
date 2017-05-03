'use strict';
const skemata = require('skemata');
const logger = require('loggy');
const BrunchError = require('./error');

const {v} = skemata;
const sourceMaps = v.either(v.bool, v.enum('absoluteUrl', 'inline')).default(true);
const configBaseSchema = v.object({
  paths: v.object({
    config: v.string,
    root: v.string.default('.'),
    public: v.string.default('public'),
    watched: v.array(v.string).default(['app', 'test', 'vendor']),
    packageConfig: v.string.default('package.json'),
    bowerConfig: v.deprecated(v.noop, 'bower support was removed'),
  }).default({}),

  files: v.objects({
    keys: ['javascripts', 'templates', 'stylesheets'],
    warner(key) {
      if (['app', 'test', 'vendor', 'assets'].includes(key)) {
        return 'was removed, use `config.paths.watched` instead';
      }
    },
  }, v.object({
    joinTo: v.either(
      v.string,
      v.objects({}, v.anymatch)
    ),
    entryPoints: v.objects({}, v.either(
      v.string,
      v.objects({}, v.anymatch)
    )),
    order: v.object({
      before: v.anymatch,
      after: v.anymatch,
    }),
    pluginHelpers: v.either(v.string, v.array(v.string)),
  })),

  npm: v.object({
    enabled: v.bool.default(true),
    globals: v.objects({}, v.string),
    aliases: v.objects({}, v.string),
    styles: v.objects({}, v.array(v.string)),
    static: v.array(v.string).default([]),
    compilers: v.array(v.string).default([]),
    detectProcess: v.bool.default(true),
  }).default({}),

  plugins: v.object({
    on: v.array(v.string).default([]),
    off: v.array(v.string).default([]),
    only: v.array(v.string).default([]),
  }, false).default({}),

  conventions: v.object({
    ignored: v.anymatch.default([/\/_/, /vendor\/(node|j?ruby-.+|bundle)\//]),
    assets: v.anymatch.default(/assets\//),
    vendor: v.anymatch.default(/node_modules\//),
  }).default({}),

  modules: v.object({
    nameCleaner: v.function.default(path => path.replace(/^app\//, '')),

    wrapper: v.deprecated(v.string, 'was removed'),
    definition: v.deprecated(v.string, 'was removed'),
    autoRequire: v.deprecated(v.string, 'was removed'),
  }).default({}),

  notifications: v.either(
    v.bool,
    v.array(v.string),
    v.object({
      app: v.string,
      icon: v.string,
      levels: v.array(v.string),
      notify: v.function,
    })
  ),

  optimize: v.bool.default(false),
  sourceMaps,

  server: v.object({
    run: v.bool.default(false),
    base: v.string.default(''),
    port: v.int.default(3333),
    hostname: v.string.default('localhost'),
    indexPath: v.string.default('index.html'),
    startupLogging: v.bool.default(true),
    noPushState: v.bool.default(false),
    noCors: v.bool.default(false),
    stripSlashes: v.bool.default(false),
    path: v.string,
    command: v.string,
    config: v.object({}).default({}),
  }).default({}),

  fileListInterval: v.int.default(65),

  watcher: v.object({
    usePolling: v.bool.default(false),
  }).default({}),

  hooks: v.object({
    preCompile: v.function.default(v.noop),
    onCompile: v.function.default(v.noop),
    teardown: v.function.default(v.noop),
  }).default({}),

  hot: v.deprecated(v.noop, 'moved to `config.plugins.hmr`'),
  bower: v.deprecated(v.noop, 'bower support was removed'),
  preCompile: v.deprecated(v.function, 'moved to `config.hooks.preCompile`'),
  onCompile: v.deprecated(v.function, 'moved to `config.hooks.onCompile`'),
  notificationsTitle: v.deprecated(v.string, 'use `config.notifications.app` instead'),
});

const overrideSchema = v.merge(
  configBaseSchema,
  v.object({}),
  {ignoreFirstDefaults: true}
);

const productionOverrideSchema = v.merge(
  configBaseSchema,
  v.object({
    optimize: v.bool.default(true),
    sourceMaps,
    overrides: v.deprecated(v.noop, 'can not define `overrides` inside an override'),

    plugins: v.object({
      autoReload: v.object({
        enabled: v.bool.default(false),
      }).default({}),
    }).default({}),
  }),
  {ignoreFirstDefaults: true}
).default({});

const configSchema = v.merge(
  configBaseSchema,
  v.object({
    overrides: v.objects(
      {specifics: {production: productionOverrideSchema}},
      overrideSchema
    ).default({}),
  })
);

module.exports = config => {
  const schema = configSchema(config);
  const formatted = skemata.formatObject(schema, 'config');
  formatted.errors.forEach(error => {
    logger.error(`${error.path}: ${error.result}`);
  });
  formatted.warnings.forEach(warn => {
    logger.warn(`${warn.path}: ${warn.warning}`);
  });
  if (!schema.ok) {
    throw new BrunchError('CFG_INVALID');
  }
  return config;
};
