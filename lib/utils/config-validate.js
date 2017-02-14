'use strict';
const skemata = require('skemata');
const logger = require('loggy');
const BrunchError = require('./error');

const v = skemata.v;
const configBaseSchema = v.object({
  paths: v.object({
    root: v.string.default('.'),
    public: v.string.default('public'),
    watched: v.array(v.string).default(['app', 'test', 'vendor']),
    ignored: v.deprecated(v.noop, 'moved to `config.conventions.ignored`'),
    assets: v.deprecated(v.noop, 'moved to `config.conventions.assets`'),
    test: v.deprecated(v.noop, 'moved to `config.conventions.test`'),
    vendor: v.deprecated(v.noop, 'moved to `config.conventions.vendor`'),
    config: v.string,
    packageConfig: v.string.default('package.json'),
    bowerConfig: v.string.default('bower.json'),
  }).default({}),

  rootPath: v.deprecated(v.noop, 'moved to `config.paths.root`'),
  buildPath: v.deprecated(v.noop, 'moved to `config.paths.public`'),

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
    defaultPaths: v.deprecated(v.noop, 'was removed'),
    defaultExtensions: v.deprecated(v.noop, 'was removed'),
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

  bower: v.object({
    enabled: v.bool.default(true),
  }).default({}),

  cra: v.bool.default(false),

  plugins: v.object({
    on: v.array(v.string).default([]),
    off: v.array(v.string).default([]),
    only: v.array(v.string).default([]),
    npm: v.deprecated(v.array(v.string).default([]), 'use `config.npm.compilers` instead'),
  }, false).default({}),

  conventions: v.object({
    ignored: v.anymatch.default([/\/_/, /vendor\/(node|j?ruby-.+|bundle)\//]),
    assets: v.anymatch.default(/assets\//),
    vendor: v.anymatch.default(/(^bower_components|node_modules|vendor)\//),
  }).default({}),

  modules: v.object({
    wrapper: v.either(v.enum('commonjs', 'amd', false), v.function).default('commonjs'),
    definition: v.either(v.enum('commonjs', 'amd', false), v.function).default('commonjs'),
    autoRequire: v.objects({}, v.array(v.string)).default({}),
    nameCleaner: v.function.default(path => path.replace(/^app\//, '')),
  }).default({}),

  notificationsTitle: v.deprecated(v.string, 'use `config.notifications.app` instead'),
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
  sourceMaps: v.either(v.bool, v.enum('old', 'absoluteUrl', 'inline')).default(true),

  server: v.object({
    base: v.string.default(''),
    port: v.int.default(3333),
    run: v.bool.default(false),
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
    awaitWriteFinish: v.either(v.bool, v.object({})),
  }).default({}),

  hooks: v.object({
    preCompile: v.function.default(v.noop),
    onCompile: v.function.default(v.noop),
    teardown: v.function.default(v.noop),
  }).default({}),

  hot: v.bool.default(false),

  preCompile: v.deprecated(v.function, 'use `config.hooks.preCompile` instead'),
  onCompile: v.deprecated(v.function, 'use `config.hooks.onCompile` instead'),
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
    sourceMaps: v.either(v.bool, v.enum('old', 'absoluteUrl', 'inline')).default(false),
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
