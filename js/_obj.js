// @aufbau/js/object.js

// :::::: HELPERS

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const toKeys        = (path)  => Array.isArray(path) ? path : String(path).split('.').filter(Boolean);

// ::::::

export const deepClone = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export const deepMerge = (target, ...sources) => {
  for (const source of sources) {
    if (!isPlainObject(source)) continue;
    for (const key of Object.keys(source)) {
      const value   = source[key];
      const current = target[key];
      target[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
    }
  }
  return target;
};

export const getPath = (source, path, fallback) => {
  let current = source;
  for (const key of toKeys(path)) {
    if (current == null) return fallback;
    current = current[key];
  }
  return current === undefined ? fallback : current;
};

export const mapValuesOf = (source, transform) => {
  const result = {};
  for (const [key, value] of Object.entries(source)) result[key] = transform(value, key);
  return result;
};

export const omitFrom = (source, keys) => {
  const skipped = new Set(keys);
  const result  = {};
  for (const key of Object.keys(source)) if (!skipped.has(key)) result[key] = source[key];
  return result;
};

export const pickFrom = (source, keys) => {
  const result = {};
  for (const key of keys) if (key in source) result[key] = source[key];
  return result;
};

export const setPath = (target, path, value) => {
  const keys = toKeys(path);
  const last = keys.pop();
  if (last === undefined) return target;

  let current = target;
  for (const key of keys) {
    if (!isPlainObject(current[key])) current[key] = {};
    current = current[key];
  }
  current[last] = value;
  return target;
};

// data-last wrappers around the existing implementations in ../object.js,
// flipped argument order only, no reimplementation.

// :::::: READ

export const 
entries = Object.entries,
keys    = Object.keys,
values  = Object.values,

path = (keys, fallback) => source => getPath(source, keys, fallback),
prop = key              => source => source?.[key];

// :::::: TRANSFORM
// every transform returns a new object, ../object.js deepMerge is deliberately not
// wrapped here because it mutates its target

export const 
assoc     = (key, value) => (source) => ({ ...source, [key]: value }),
mapValues = fn           => (source) => mapValuesOf(source, fn),
merge     = (...sources) => (target) => Object.assign({}, target, ...sources),
omit      = list         => (source) => omitFrom(source, list),
pick      = list         => (source) => pickFrom(source, list);

export const dissoc = (key) => (source) => {
  const { [key]: removed, ...rest } = source;
  return rest;
};
