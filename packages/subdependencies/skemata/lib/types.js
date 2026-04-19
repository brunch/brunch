'use strict';

const bestSuggestions = require('./suggest');
const util = require('./util');
const _type = util._type;
const _clone = util._clone;

const v = {};

const _result = (ok, expType, acType, val, warning) => {
  if (ok) {
    return {ok: true, warning};
  }
  return {ok: false, type: 'simple', expType, acType, val};
};

const _collResult = (itemResults, warning) => {
  const hasErrItems = itemResults.filter(item => {
    const result = item.result;
    return !result.ok;
  }).length > 0;
  if (hasErrItems) {
    return {ok: false, type: 'collection', itemResults, warning};
  } else {
    return {ok: true, type: 'collection', itemResults, warning};
  }
};

const _collItem = (path, result) => {
  return {path, result};
};

const defType = (human, fn, _props, defaultValue) => {
  fn.human = human;
  fn._props = _props;
  if (defaultValue !== undefined) fn.defaultValue = defaultValue;
  fn.default = val => {
    const newFn = fn.bind({});
    return defType(human, newFn, _props, val);
  };
  fn.undefault = () => {
    const newFn = fn.bind({});
    return defType(human, newFn, _props);
  };
  return fn;
};

const isType = type => {
  return defType(type, x => {
    if (_type(x) === type) {
      return _result(true);
    }
    return _result(false, type, _type(x), x);
  });
};

const compose = (f1, f2) => {
  return defType(f1.human, x => {
    const r = f1(x);
    if (!r.ok) return r;
    return f2(x);
  }, f2._props);
};


const _arrayOf = (elType) => {
  return ary => {
    const rs = ary.map(el => elType(el));
    const rs_ = rs.map((r, idx) => {
      return _collItem(idx, r);
    });
    return _collResult(rs_);
  };
};

const _objectOf = (schema, suggest) => {
  if (suggest === undefined) suggest = true;
  const fn = obj => {
    const rs = Object.keys(obj).map(key => {
      const val = obj[key];
      if (!(key in schema)) {
        const r = _result(true);
        let warning;
        if (suggest) {
          const suggestions = bestSuggestions(key, Object.keys(schema));
          if (suggestions.length > 0) {
            warning = `perhaps you meant ${suggestions.join(', ')}`;
          }
        }
        if (warning) {
          r.warning = warning;
        }
        return _collItem(key, r);
      }
      const ty = schema[key];
      const r = ty(val);
      return _collItem(key, r);
    });
    Object.keys(schema).forEach(key => {
      if (key in obj) {
        return;
      }
      const ty = schema[key];
      if ('defaultValue' in ty) {
        obj[key] = _clone(ty.defaultValue);
        ty(obj[key]);
      }
    });
    return _collResult(rs);
  };
  fn._props = {schema, suggest};
  return fn;
};

const _mergeObjectOf = (v1, v2, opts) => {
  const deepUndefault = val => {
    if (val.human === 'object' && val._props && val._props.elSchema && val._props.elSchema.human === 'object') {
      const blank = v.objects({}, v.object({}));
      return _mergeObjectOf(val, blank, opts);
    } else if (val.human === 'object' && val._props && val._props.schema) {
      const blank = v.object({});
      return _mergeObjectOf(val, blank, opts);
    } else {
      return val.undefault();
    }
  };

  const uniq = ary => Array.from(new Set(ary));
  if (v1.human === 'object' && v2.human === 'object' && v1._props.schema && v2._props.schema) {
    const schema1 = v1._props.schema;
    const schema2 = v2._props.schema;
    const mergedSchema = {};
    const allKeys = uniq(Object.keys(schema1).concat(Object.keys(schema2)));
    allKeys.forEach(key => {
      if (key in schema1 && key in schema2) {
        // present in both
        const val1 = schema1[key];
        const val2 = schema2[key];

        try {
          const val = _mergeObjectOf(val1, val2, opts);
          mergedSchema[key] = val;
        } catch (e) {
          if (val1.human === val2.human) {
            const val = val2;
            mergedSchema[key] = val;
          } else {
            throw new Error(`can't merge schemas for key '${key}' (${val1.human} and ${val2.human})`);
          }
        }

        if ('defaultValue' in val2) {
          mergedSchema[key] = mergedSchema[key].default(val2.defaultValue);
        } else if ('defaultValue' in val1) {
          mergedSchema[key] = mergedSchema[key].default(val1.defaultValue);
        }
      } else {
        let val = key in schema1 ? schema1[key] : schema2[key];

        if (opts && opts.ignoreFirstDefaults && key in schema1) {
          val = deepUndefault(val);
        }
        mergedSchema[key] = val;
      }
    });
    return v.object(mergedSchema);
  } else if (v1.human === 'object' && v2.human === 'object' && v1._props.elSchema && v2._props.elSchema) {
    const elSchema1 = v1._props.elSchema;
    const elSchema2 = v2._props.elSchema;
    const mergedElSchema = _mergeObjectOf(elSchema1, elSchema2, opts);
    return v.objects(v1._props.props, mergedElSchema);
  }
  throw new Error("can't merge");
};

const _objectsOf = (props, elSchema) => {
  const specifics = props && props.specifics || {};
  const fn = obj => {
    const rs = Object.keys(obj).map(key => {
      const val = obj[key];
      let warning;
      if (props && props.keys && props.keys.indexOf(key) === -1) {
        const customWarning = props.warner && props.warner(key);
        if (customWarning) {
          warning = customWarning;
        } else {
          const suggestions = bestSuggestions(key, props.keys);
          warning = `unrecognized key: ${key}; expected either of ${props.keys.join(', ')}`;
          if (suggestions.length > 0) {
            warning = warning + '; perhaps you meant ' + suggestions.join(', ');
          }
        }
      }
      const itemSchema = key in specifics ? specifics[key] : elSchema;
      const r = itemSchema(val);
      if (warning) {
        r.warning = r.warning ? r.warning + '; ' + warning : warning;
      }
      return _collItem(key, r);
    });
    Object.keys(specifics).forEach(key => {
      if (key in obj) return;
      const ty = specifics[key];
      if ('defaultValue' in ty) {
        obj[key] = _clone(ty.defaultValue);
        ty(obj[key]);
      }
    });
    return _collResult(rs);
  };
  fn._props = {props, elSchema};
  return fn;
};

v.noop = () => _result(true);

v._string = isType('string');
v._bool = isType('boolean');
v._array = isType('array');
v._function = isType('function');
v._regexp = isType('regexp');
v._number = isType('number');
v._object = isType('object');

v.string = v._string;
v.bool = v._bool;
v.function = v._function;
v.regexp = v._regexp;
v.int = v._number;
v.int.human = 'int';

v.array = elType => compose(v._array, _arrayOf(elType));
v.object = (schema, suggest) => compose(v._object, _objectOf(schema, suggest));
v.objects = (props, elSchema) => compose(v._object, _objectsOf(props, elSchema));
v.merge = _mergeObjectOf;

v.either = function() {
  const types = [].slice.call(arguments);
  const humanTypes = types.map(type => type.human || '<>');
  const human = `either of types ${JSON.stringify(humanTypes)}`;
  return defType(human, x => {
    const type = types.find(t => t(x).ok);
    if (type) {
      return type(x);
    }
    return _result(false, human, _type(x), x);
  });
};

v.enum = function() {
  const vals = [].slice.call(arguments);
  const human = `either of values ${JSON.stringify(vals)}`;
  return defType(human, x => {
    const check = vals.indexOf(x) !== -1;
    if (check) {
      return _result(true);
    }
    return _result(false, human, _type(x), x);
  });
};

v.deprecated = (elType, message) => {
  return defType(elType.human, x => {
    const r = elType(x);
    const warning = 'deprecated' + (message ? ': ' + message : '');
    r.warning = r.warning ? r.warning + '; ' + warning : warning;
    return r;
  });
};

v.anymatch_ = v.either(v.string, v.regexp, v.function);
v.anymatch = v.either(v.anymatch_, v.array(v.anymatch_));

module.exports = v;
