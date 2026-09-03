// @pulgasari/hash

export const stableStringify = (value) =>
    typeof value === 'string'                    ? value
  : value === null || typeof value !== 'object'  ? String(value)
  : Array.isArray(value)                         ? `[${value.map(stableStringify).join(',')}]`
  : `{${Object.keys(value).sort().map(key => `${key}:${stableStringify(value[key])}`).join(',')}}`;

export const hash = (value) => {
  const text = typeof value === 'string' ? value : stableStringify(value);
  let result = 5381;
  let index  = text.length;
  while (index) result = (result * 33) ^ text.charCodeAt(--index);
  return result >>> 0;
};

export const hashKey = (value) => hash(value).toString(36);
