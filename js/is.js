// predicates.js

export const

isArray    = Array.isArray,
isFn       = v => typeof v === 'function',
isIterable = v => !isString(v) && isFn(v?.[Symbol.iterator]),
isString   = v => typeof v === 'string',
isNumber   = v => typeof v === 'number' && Number.isFinite(v),
isNullish  = v => typeof v === 'undefined' || typeof v === 'null',

isObject = v => v !== null && typeof v === 'object' && !isArray(v),

isNode       = v => typeof v?.nodeType === 'number',
isElement    = v => v?.nodeType === 1,
isDocument   = v => v?.nodeType === 9,
isFragment   = v => v?.nodeType === 11,
isElementish = v => v?.nodeType === 1 || v?.nodeType === 9 || v?.nodeType === 11,
isWindow     = v => v != null && v === v.window,

// DOM-Formen
isEDO      = v => isObject(v) && !isElementish(v) && !!(v.tag || v.tagName),
isHTML     = v => isString(v) && v.trim().startsWith('<'),
isIdLike   = v => isString(v) && v.charCodeAt(0) === 35 && !/[\s.]/.test(v),
isURL      = v => isString(v) && v.includes('://'),

// Form-Controls
isCheckable   = el => el?.type === 'checkbox' || el?.type === 'radio',
isMultiSelect = el => el?.tagName === 'SELECT' && el.multiple,

// Werte
isEmpty = v => v === '' || v === null || v === undefined;

// is.js
/*
export *         from './predicates.js';
import * as cond from './predicates.js';

const upperFirst = (word) => word.charAt(0).toUpperCase() + word.slice(1);

function is (value, ...predicates) {
  if (typeof value === 'undefined') return false;
  
  predicates.forEach (pred => {
    const name   = 'is' + upperFirst(pred);
    const result = cond.name(value);
    if (!result) return false;
  }
  
  return true;
}
*/



