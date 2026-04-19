import test from 'ava';

import skemata from './lib/index';
const v = skemata.v;

test('primitive type validation', t => {
  t.plan(2);

  t.truthy(v.string('string').ok);
  t.falsy(v.string(10).ok);
});

test('compound type validation', t => {
  t.plan(9);

  const either = v.either(v.int, v.bool);
  t.truthy(either(42).ok);
  t.truthy(either(false).ok);
  t.falsy(either('string').ok);

  const e_num = v.enum('a', 'b', false);
  t.truthy(e_num('a').ok);
  t.truthy(e_num('b').ok);
  t.truthy(e_num(false).ok);
  t.falsy(e_num('c').ok);
  t.falsy(e_num(true).ok);
  t.falsy(e_num(42).ok);
});

test('array type validation', t => {
  t.plan(2);

  const ary = v.array(v.int);
  t.truthy(ary([1, 2]).ok);
  t.falsy(ary([1, 'c']).ok);
});

test('object-of schema validation', t => {
  t.plan(5);

  const schema = v.object({
    foo: v.bool,
    bar: v.object({
      hey: v.string
    })
  });

  t.truthy(schema({ foo: true }).ok);
  t.truthy(schema({ bar: { hey: 'yo' } }).ok);
  t.falsy(schema({ foo: 1 }).ok);
  t.falsy(schema({ bar: 42 }).ok);
  t.falsy(schema({ bar: { hey: 1 } }).ok);
});

test('objects-of schema validation', t => {
  t.plan(4);

  const schema = v.objects({ keys: ['a'] }, v.object({ foo: v.bool }));

  t.truthy(schema({ a: { foo: true } }).ok);
  t.falsy(schema({ a: 42 }).ok);

  const warned = schema({ b: { foo: true } }).itemResults.find(x => x.path === 'b').result;
  t.truthy(warned.ok);
  t.truthy(warned.warning);
});

test('object default values (flat and nested)', t => {
  t.plan(2);

  const obj = {};
  const schema = v.object({
    foo: v.int.default(42),
    bar: v.object({
      baz: v.string.default('yo')
    }).default({})
  });

  t.truthy(schema(obj).ok);
  t.deepEqual(obj, { foo: 42, bar: { baz: 'yo' } });
});


test('object merge', t => {
  t.plan(4);

  const schemaA = v.object({
    a: v.bool,
    b: v.object({
      z: v.int
    })
  });
  const schemaB = v.object({
    c: v.string,
    b: v.object({
      y: v.int
    })
  });

  const mergedSchema = v.merge(schemaA, schemaB);

  t.truthy(mergedSchema({ a: true, c: 'yo', b: { y: 2, z: 3 } }).ok);
  t.falsy(mergedSchema({ a: 42, c: 'yo', b: { y: 2, z: 3 } }).ok);
  t.falsy(mergedSchema({ a: true, c: 42, b: { y: 2, z: 3 } }).ok);
  t.falsy(mergedSchema({ a: true, c: 'yo', b: { y: false, z: 3 } }).ok);
});

test('warnings', t => {
  const schema = v.object({
    a: v.bool,
    b: v.deprecated(v.string, 'moved to `c`'),
    files: v.objects({ keys: ['javascripts', 'stylesheets'] }, v.bool)
  });

  const result = schema({ a: true, b: 'string', files: { javascript: true } });
  const fmt = skemata.formatObject(result, 'config');

  t.deepEqual(fmt, {
    errors: [],
    warnings: [
      { path: 'config.b', warning: 'deprecated: moved to `c`' },
      { path: 'config.files.javascript', warning: 'unrecognized key: javascript; expected either of javascripts, stylesheets; perhaps you meant javascripts' }
    ]
  });
});

test('errors and warnings', t => {
  const schema = v.object({
    a: v.bool,
    b: v.deprecated(v.string, 'moved to `c`'),
    files: v.objects({ keys: ['javascripts', 'stylesheets'] }, v.bool)
  });

  const result = schema({ a: 42, b: 'string', files: { javascript: true } });
  const fmt = skemata.formatObject(result, 'config');

  t.deepEqual(fmt, {
    errors: [
      { path: 'config.a', result: 'expected: boolean, got: number (42)' }
    ],
    warnings: [
      { path: 'config.b', warning: 'deprecated: moved to `c`' },
      { path: 'config.files.javascript', warning: 'unrecognized key: javascript; expected either of javascripts, stylesheets; perhaps you meant javascripts' }
    ]
  });
});
