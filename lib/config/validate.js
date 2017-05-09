'use strict';
// const logger = require('loggy');
// const BrunchError = require('./error');
const joi = require('joi');

const j = joi.extend(j => ({
    base: j.array().items(
      j.string(),
      j.object().type(RegExp),
      j.func()
    ).single(),
    name: 'anymatch',
    // coerce(value, _state, _opts) {
    //   console.log('coerce')
    //   return `wrapped${value || this._flags.default}`
    // },
    pre(value, _state, _opts) {
      console.log('pre')
      return `wrapped${value}`
    }
}));

j.set = type => {
  return j.array()
    .items(type || j.any())
    .unique()
    .single()
    .default();
};

j.hash = vals => {
  return j.object()
    .pattern(/(?:)/, vals)
    .default();
};

const noop = () => {};

const entryPoints = j.hash(j.string());
const joinTo = j.compile([
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
    }).default(),
    stylesheets: j.object({
      joinTo,
      entryPoints,
      order: j.object({
        before: j.anymatch(),
        after: j.anymatch(),
      }).default(),
    }).default(),
    templates: j.object({
      joinTo,
    }).default(),
  }).default(),

  npm: j.object({
    globals: j.hash(j.string()),
    aliases: j.hash(j.string()),
    styles: j.hash(j.set(j.string())),
    compilers: [
      j.set(j.string()),
      j.hash(
        j.set(j.string())
      ),
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
    j.set(j.string()),
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
    path: j.string(),
    command: j.string(),

    // config: v.object({}).default(),
  }).default(),

  watcher: j.object({
    ignored: j.anymatch().default(),
    usePolling: j.boolean().default(false),
  }).default(),

  hooks: j.object({
    preCompile: j.func().maxArity(0).default(noop),
    onCompile: j.func().maxArity(2).default(noop),
    teardown: j.func().maxArity(0).default(noop),
  }).default(),

  fileListInterval: j.number().integer().default(65),
  plugins: j.object().default(),

  // bowerConfig: v.deprecated(v.noop, 'bower support was removed'),
  // static: j.array().items(j.string()).default([]),
  // modules: v.deprecated(v.object, 'was removed'),
  // hot: v.deprecated(v.noop, 'moved to `config.plugins.hmr`'),
  // bower: v.deprecated(v.noop, 'bower support was removed'),
  // preCompile: v.deprecated(v.function, 'moved to `config.hooks.preCompile`'),
  // onCompile: v.deprecated(v.function, 'moved to `config.hooks.onCompile`'),
  // notificationsTitle: v.deprecated(v.string, 'use `config.notifications.app` instead'),
});

const options = {
  abortEarly: false,
  convert: false,
};

module.exports = config => {
  return j.validate(config, schema, options);
};

// module.exports = config => {
//   const schema = configSchema(config);
//   const formatted = skemata.formatObject(schema, 'config');
//   formatted.errors.forEach(error => {
//     logger.error(`${error.path}: ${error.result}`);
//   });
//   formatted.warnings.forEach(warn => {
//     logger.warn(`${warn.path}: ${warn.warning}`);
//   });
//   if (!schema.ok) {
//     throw new BrunchError('CFG_INVALID');
//   }
//   return config;
// };
