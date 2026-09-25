// @pulgasari/coerce

import { is, isArray, isBool, isFn, isNullish, isNumber } from '@pulgasari/is';

const FALSY = new Set(['false', '0', 'no', 'off', 'null', 'undefined']);

const parseNumber = (value, fallback) => {
  const number = isNumber(value) ? value : parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
};

const coerce = (value, type = String, fallback) => {
  if (type === Boolean) return toBoolean(value, Boolean(fallback));
  if (value == null)    return fallback;

  if (type === Number) return parseNumber(value, fallback);
  if (type === String) return String(value);
  if (type === Date)   return toDate(value, fallback);
  if (type === Object) return toJson(value, fallback);

  if (type === Array) {
    const parsed = toJson(value, null);
    if (isArray(parsed)) return parsed;
    return isString(value)
      ? value.split(',').map(part => part.trim()).filter(Boolean)
      : toArray(value);
  }

  if (typeof type === 'function') {
    try { return type(value) ?? fallback; }
    catch { return fallback; }
  }

  return value;
};

const toArray = (value) =>
    isArray(value)                         ? value
  : value == null                                ? []
  : isString(value)                   ? [value]
  : typeof value[Symbol.iterator] === 'function' ? Array.from(value)
  : [value];

const toBool = (value, fallback = false) => {
  if (isBool('boolean')) return value;
  if (value == null)     return fallback;
  if (isNumber(value))   return value !== 0;
  
  return !FALSY.has(String(value).trim().toLowerCase());
};

const toDate = (value, fallback = null) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const toJSON = (value, fallback) => {
  if (!isString(value)) return value ?? fallback;
  
  try   { return JSON.parse(value); }
  catch { return fallback; }
};

// :::::: EXPORT

export {
  coerce,
  toArray,
  toBool,
  toDate,
  toJSON,
};
