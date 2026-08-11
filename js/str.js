// str.js

// Helper functions for word splitting and casing
const upperFirst = (word) => word.charAt(0).toUpperCase() + word.slice(1);

const toWords = (value) => String(value ?? '')
  .replace(/([a-z\d])([A-Z])/g, '$1 $2')
  .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  .replace(/[\s\-_.]+/g, ' ')
  .trim()
  .toLowerCase()
  .split(' ')
  .filter(Boolean);


export const // Standalone exportable transform functions
capitalize     = value => String(value ?? '').charAt(0).toUpperCase() + String(value ?? '').slice(1),
toLowerCase    = value => String(value ?? '').toLowerCase(),
toUpperCase    = value => String(value ?? '').toUpperCase(),
toCamelCase    = value => toWords(value).map((word, index) => index ? upperFirst(word) : word).join(''),
toConstantCase = value => toWords(value).join('_').toUpperCase(),
toKebabCase    = value => toWords(value).join('-'),
toPascalCase   = value => toWords(value).map(upperFirst).join(''),
toSnakeCase    = value => toWords(value).join('_'),
toTitleCase    = value => toWords(value).map(upperFirst).join(' '),
trim           = value => String(value ?? '').trim(),
trimEnd        = value => String(value ?? '').trimEnd(),
trimStart      = value => String(value ?? '').trimStart(),
unquote        = value => String(value ?? '').replace(/^(['"`])([\s\S]*)\1$/, '$2');

export const 
startsWith = (value, ...prefixes) => prefixes.some((prefix) => String(value ?? '').startsWith(prefix)),
  endsWith = (value, ...suffixes) => suffixes.some((suffix) => String(value ?? '').endsWith(suffix));

const utils = {
  capitalize,
  toLowerCase,
  toUpperCase,
  toCamelCase,
  toConstantCase,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
  toTitleCase,
  trim,
  trimEnd,
  trimStart,
  unquote,
  startsWith,
  endsWith
};

/**
 * Dual-use string utility supporting both chainable str(val) calls
 * and direct static str.method(val) execution.
 */
export const str = Object.assign(
  function str(val) {
    const s = String(val ?? '');

    return new Proxy({}, {
      get(_, prop) {
        if (prop === 'toString' || prop === 'valueOf') {
          return () => s;
        }
        if (prop in utils) {
          return (...args) => utils[prop](s, ...args);
        }
        const nativeAttr = s[prop];
        return typeof nativeAttr === 'function' ? nativeAttr.bind(s) : nativeAttr;
      }
    });
  },
  utils
);

export default str;
