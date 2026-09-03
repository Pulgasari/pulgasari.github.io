// @pulgasari/coerce

const FALSY = new Set(['false', '0', 'no', 'off', 'null', 'undefined']);

const parseNumber = (value, fallback) => {
  const number = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
};

export const coerce = (value, type = String, fallback) => {
  if (type === Boolean) return toBoolean(value, Boolean(fallback));
  if (value == null)    return fallback;

  if (type === Number) return parseNumber(value, fallback);
  if (type === String) return String(value);
  if (type === Date)   return toDate(value, fallback);
  if (type === Object) return toJson(value, fallback);

  if (type === Array) {
    const parsed = toJson(value, null);
    if (Array.isArray(parsed)) return parsed;
    return typeof value === 'string'
      ? value.split(',').map(part => part.trim()).filter(Boolean)
      : toArray(value);
  }

  if (typeof type === 'function') {
    try { return type(value) ?? fallback; }
    catch { return fallback; }
  }

  return value;
};

export const toArray = (value) =>
    Array.isArray(value)                         ? value
  : value == null                                ? []
  : typeof value === 'string'                    ? [value]
  : typeof value[Symbol.iterator] === 'function' ? Array.from(value)
  : [value];

export const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value == null) return fallback;
  if (typeof value === 'number') return value !== 0;
  return !FALSY.has(String(value).trim().toLowerCase());
};

export const toDate = (value, fallback = null) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

export const toJson = (value, fallback) => {
  if (typeof value !== 'string') return value ?? fallback;
  try { return JSON.parse(value); }
  catch { return fallback; }
};
