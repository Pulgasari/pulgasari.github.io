// fp/string.js

export const
ensurePrefix = (value, prefix) => String(value).startsWith(prefix) ? String(value) : prefix + value,
ensureSuffix = (value, suffix) => String(value).  endsWith(suffix) ? String(value) : value + suffix;

export const
templateOf = (value, values = {})          => String(value).replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match),
truncateOf = (value, length, suffix = '…') => String(value).length <= length ? String(value) : String(value).slice(0, Math.max(0, length - suffix.length)) + suffix;    

// already unary in ../string.js and therefore pipe-ready as they are
export const dedent = (value) => {
  const lines   = String(value).replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  const filled  = lines.filter(line => line.trim());
  if (!filled.length) return '';
  const indent = Math.min(...filled.map(line => line.match(/^ */)[0].length));
  return lines.map(line => line.slice(indent)).join('\n');
};

const upperFirst = (word) => word.charAt(0).toUpperCase() + word.slice(1);
const toWords = (value) => String(value)
  .replace(/([a-z\d])([A-Z])/g, '$1 $2')
  .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  .replace(/[\s\-_.]+/g, ' ')
  .trim()
  .toLowerCase()
  .split(' ')
  .filter(Boolean);

// :::::: UNARY TRANSFORMS

export const
capitalize     = value => String(value).charAt(0).toUpperCase() + String(value).slice(1),
toLowerCase    = value => value.toLowerCase (),
toUpperCase    = value => value.toUpperCase (),
toCamelCase    = value => toWords(value).map((word, index) => index ? upperFirst(word) : word).join(''),    
toConstantCase = value => toWords(value).join('_').toUpperCase(),
toKebabCase    = value => toWords(value).join('-'),
toPascalCase   = value => toWords(value).map(upperFirst).join(''),
toSnakeCase    = value => toWords(value).join('_'),
toTitleCase    = value => toWords(value).map(upperFirst).join(' '),
trim           = value => value.trim      (),
trimEnd        = value => value.trimEnd   (),
trimStart      = value => value.trimStart (),
unquote        = value => String(value).replace(/^(['"`])([\s\S]*)\1$/, '$2');

export const slugify = (value) => String(value)
  .replace(/ß/g, 'ss')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase();

// :::::: CONFIGURED TRANSFORMS

export const
padEnd     = (length, filler = ' ') => (value) => value.padEnd(length, filler),
padStart   = (length, filler = ' ') => (value) => value.padStart(length, filler),
prefix     = (text)                 => (value) => ensurePrefix(value, text),
replace    = (search, replacement)  => (value) => value.replace(search, replacement),
replaceAll = (search, replacement)  => (value) => value.replaceAll(search, replacement),    
split      = (separator)            => (value) => value.split(separator),
suffix     = (text)                 => (value) => ensureSuffix(value, text),
template   = (values)               => (value) => templateOf(value, values),
truncate   = (length, ending)       => (value) => truncateOf(value, length, ending);

// :::::: QUERY

export const 
endsWith   = search => value => value.endsWith   (search),
startsWith = search => value => value.startsWith (search);




/*
// @aufbau/utils/strings.js

export let
capitalize = str => str.charAt(0).toUpperCase() + str.slice(1),
prefixed   = ( value, prefix='--' ) => String(value).startsWith(prefix) ? String(value) : prefix+value,
suffixed   = ( value, suffix='px' ) => String(value).  endsWith(suffix) ? String(value) : value+suffix,
unprefixed = ( value, prefix='--' ) => String(value).startsWith(prefix) ? String(value).slice(   prefix.length) : String(value),
unsuffixed = ( value, suffix='px' ) => String(value).  endsWith(suffix) ? String(value).slice(0,-suffix.length) : String(value),





// The Chain
class VanillaXStrChain {
  constructor (s) { this._str = s; }
  toString    ()  { return String(this._str); }
  valueOf     ()  { return this._str; }
  
  [Symbol.toPrimitive] (hint) {
    return (hint === 'number') 
      ? Number(this._str)
      : String(this._str);
  }
}
// add all methods to chain
for (let [name, fn] of Object.entries({
  toCamelCase, 
  toConstantCase, 
  toKebabCase, 
  toPascalCase, 
  toSnakeCase,
  replace, 
  replaceAll
})) {
  Object.defineProperty( StrChain.prototype, name, {
    value: function( ...args ){
      this._str = fn( this._str, ...args );
      return this;
    },
    configurable: true,
    writable: true
  });
}
export let str = s => new VanillaXStrChain(s);
*/
