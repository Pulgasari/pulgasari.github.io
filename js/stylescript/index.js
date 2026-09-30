/* stylescript prototype 2 entwurf */

import shift           from '@pulgasari/shift';
import { toKebabCase } from '@pulgasari/str';


const types = {}; // shared internal dictionary for registered CSS types

// resolve JS values (strings, numbers, arrays, objects) into CSS
const format = shift ({
  isNullish : '',
  isArray   : (value) => value.map(format).join('\n'),
  isObject  : (value) => Object.entries(value).map(toKebabCase).join('\n'),
  fallback  : (value) => String(value),
});

// combine template fragments with interpolated values
const interpolate = (strings, ...values) => {
  return strings.reduce((acc, str, i) => {
    const interpolated = i < values.length ? format(values[i]) : '';
    return acc + str + interpolated;
  }, '');
};

const process = (code) => {
  code = processTypes (code);
  return code;
}

// resolve registered custom types
// like <color-with-benefits> or <colorWithBenefits>
const processTypes = (code) => {
  for (const key in types) {
    const regex = new RegExp(`<${key}>`, 'g');
    code = code.replace(regex, types[key]);
  }
  return code;
}

// core tagged template function
function css (strings, ...values) {
  let code;
  code = interpolate (strings, ...values)|
  code = process     (code);
  return code.trim();
}

css.types = types;

// :::::: THE CLASS

class StyleScript {
  static css         = css;
  static format      = format;
  static interpolate = interpolate;
  static process     = css;
}

// :::::: EXPORT

export { StyleScript, css, types };
export { format, interpolate, process };
export default StyleScript;
