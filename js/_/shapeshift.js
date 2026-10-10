function toElements (target) {
  if (isNullish  (target)) return [document.documentElement];
  if (isString   (target)) return [...document.querySelectorAll(target)];
  if (isElement  (target)) return [target]; // target instanceof Element
  if (isIterable (target)) return [...target].filter(isElement);
  return [];
}


function toElements (target) {
  return shift (target) ({
    isNullish  : () => [document.documentElement],
    isString   : () => [...document.querySelectorAll(target)],
    isElement  : () => [target],
    isIterable : () => [...target].filter(isElement),
    fallback   : () => [],
  });
}

const toElements = (target) => shift ({
  isNullish  : () => [document.documentElement],
  isString   : () => [...document.querySelectorAll(target)],
  isElement  : () => [target],
  isIterable : () => [...target].filter(isElement),
  fallback   : () => [],
});






/* variante 1 :: Data-First Curried */

import { resolve } from './is.js';

/**
 * Pattern matching function (Data-First).
 * Usage: shift(target)(cases)
 */
export const shift = (target) => (cases) => {
  for (const [key, handler] of Object.entries(cases)) {
    if (key === 'fallback' || key === 'default' || key === '_') continue;

    // Resolve predicate string (e.g. 'isNullish' or 'string') to its function
    const predicate = resolve(key);
    
    if (predicate(target)) {
      return typeof handler === 'function' ? handler(target) : handler;
    }
  }

  const fallback = cases.fallback ?? cases.default ?? cases._;
  return typeof fallback === 'function' ? fallback(target) : fallback;
};

/* usage:

function toElements(target) {
  return shift(target)({
    isNullish  : () => [document.documentElement],
    isString   : () => [...document.querySelectorAll(target)],
    isElement  : () => [target],
    isIterable : () => [...target].filter(isElement),
    fallback   : () => [],
  });
}

*/


/* Variante 2: Cases-First / Point-Free (shift(cases)(target)) */

import { resolve, isElement } from './is.js';

/**
 * Pattern matching function (Cases-First / Point-Free).
 * Usage: shift(cases)(target)
 */
export const shift = (cases) => (target) => {
  for (const [key, handler] of Object.entries(cases)) {
    if (key === 'fallback' || key === 'default' || key === '_') continue;

    const predicate = resolve(key);

    if (predicate(target)) {
      return typeof handler === 'function' ? handler(target) : handler;
    }
  }

  const fallback = cases.fallback ?? cases.default ?? cases._;
  return typeof fallback === 'function' ? fallback(target) : fallback;
};

/* usage:

const toElements = shift({
  isNullish  : () => [document.documentElement],
  isString   : (target) => [...document.querySelectorAll(target)],
  isElement  : (target) => [target],
  isIterable : (target) => [...target].filter(isElement),
  fallback   : () => [],
});
*/

/* Variante 3: Direktes 2-Argument / Eager (shift(target, cases)) */

import { resolve } from './is.js';

/**
 * Direct pattern matching function.
 * Usage: shift(target, cases)
 */
export function shift(target, cases) {
  for (const [key, handler] of Object.entries(cases)) {
    if (key === 'fallback' || key === 'default' || key === '_') continue;

    if (resolve(key)(target)) {
      return typeof handler === 'function' ? handler(target) : handler;
    }
  }

  const fallback = cases.fallback ?? cases.default ?? cases._;
  return typeof fallback === 'function' ? fallback(target) : fallback;
}


const toElements = (target) => shift(target, {
  isNullish  : () => [document.documentElement],
  isString   : () => [...document.querySelectorAll(target)],
  isElement  : () => [target],
  isIterable : () => [...target].filter(isElement),
  fallback   : () => [],
});

/*//////////// variante 4: Das Universale shift (Best DX) ////////////*/
/* Unterstützt alle Aufruf-Formen nahtlos 
- shift(target, cases)
- shift(target)(cases)
- Point-Free via shift.from(cases)).
*/

import { isFn, resolve } from './is.js';

// evaluates target against case rules
function matchCases (target, cases) {
  for (const [key, handler] of Object.entries(cases)) {
    if (key === 'fallback' || key === 'default' || key === '_') continue;
    // resolve() automatically maps 'isNullish' -> predicates.isNullish
    const predicate = resolve(key);
    if (predicate(target)) return isFn (handler) ? handler (target) : handler;
  }

  const fallback = cases.fallback ?? cases.default ?? cases._;
  return isFn (fallback) ? fallback (target) : fallback;
}

// universal pattern matcher supporting direct and curried signatures.
function shift (target, cases) {
  return (arguments.length >= 2)
  ? matchCases (target, cases) // direct signature: shift(target, cases)
  : (casesObject) => matchCases (target, casesObject); // curried data-first: shift(target)(cases)     
}

// cases-first helper for point-free functions: shift.from(cases)(target)
shift.from = (cases) => (target) => matchCases(target, cases);

export { shift };
export default shift;

/* USAGE EXAMPLES */

import { shift } from './shift.js';

// --- EXAMPLE 1 ---
// normalizes different date inputs into a native Date object.
export const parseDate = shift.from({
  isDate       : date      => date,
  isNumber     : timestamp => new Date (timestamp),
  isDateString : str       => new Date (str),
  isNullish    : ()        => new Date, // defaults to now
  fallback     : () => null,
});

// usage:
parseDate(new Date());       // Returns same Date
parseDate(1700000000000);    // Converted from timestamp
parseDate('2026-09-26');     // Parsed string
parseDate(null);             // Current date
parseDate({ invalid: 123 }); // null


import { shift } from './shift.js';

// --- EXAMPLE 2 ---
// extracts a string/primitive value from various input targets.
export function extractValue (target) {
  return shift (target, {
    isElement : el => el.value ?? el.textContent?.trim() ?? '',
    isString  : selector => {
      const el = document.querySelector(selector);
      return el ? extractValue(el) : selector;
    },
    isFn      : fn => fn(),
    isNullish : '',
    fallback  : String(target),
  });
}

export function extractValue (target) {
  return shift (target, {
    isElement : el => el.value ?? el.textContent?.trim() ?? '',
    isString  : selector => extractValue(document.querySelector(selector) || selector),
    isFn      : fn => fn(),
    isNullish : '',
    fallback  : String(target),
  });
}

// usage:
extractValue('#user-input');          // Reads value from DOM node
extractValue(document.body);          // Reads textContent
extractValue(() => 'computed value'); // Runs getter function
extractValue(42);                     // '42'

// --- EXAMPLE 3 ---
// 3. API Response Normalisierer (normalizePayload)
​// Nützt die Curried Form shift(data)(cases) in einer Async Data Pipeline.

import { shift } from './shift.js';

/**
 * Transforms incoming API data into a predictable standard shape.
 */
export async function fetchUserData (userId) {
  const rawResponse = await api.get(`/users/${userId}`);

  return shift (rawResponse)({
    // Native Error or HTTP error instance
    isError : err => ({ ok: false, message: err.message, data: null }),

    // Valid JSON string needing parse
    isJSON : json => ({ ok: true, data: JSON.parse(json) }),

    // Plain object response
    isPlainObject : obj => ({ ok: true, data: obj }),

    // Empty or invalid response fallback
    isBlank  : { data: null, ok: false, message: 'Empty payload' },
    fallback : { data: null, ok: false, message: 'Unexpected payload format' },
  });
}

// --- EXAMPLE 4 ---
// 4. Tabellen-Spalten Formatter (formatCell)
// ​Nützt shift.from(cases) direkt als Map-Callback beim Rendern von Data-Grids.

import { shift } from './shift.js';

// formats arbitrary cell values for display in a UI table.
const formatCell = shift.from({
  isNullish  : '—',
  isNumber   : val  => new Intl.NumberFormat('de-DE').format(val),
  isDate     : date => date.toLocaleDateString('de-DE'),
  isBoolean  : bool => (bool ? 'Ja' : 'Nein'),
  isIterable : list => [...list].join(', '), // custom predicate check from @pulgasari/is
  fallback   : val  => String(val),
});

// Usage in Data Rendering:
const rowData      = [null, 1250.5, new Date(), true, ['Admin', 'Editor']];
const formattedRow = rowData.map(formatCell);
// Output: ['—', '1.250,5', '26.9.2026', 'Ja', 'Admin, Editor']

// --- EXAMPLE 5 ---
// 5. Polymorpher Children-Renderer (renderNode)
​// Verarbeitet JSX/DOM/Component-Bäume flexibel in UI-Libraries.

// normalizes different children shapes into an array of renderable nodes.
export function renderNode (children) {
  return shift(children, {
    // skip empty nodes
    isNullish : () => [],
    // lazy components or factory functions
    isFn : fn => renderNode(fn()),
    // single DOM / EDO element
    isElementish : node => [node],
    // collections (Array, Set, NodeList) excluding raw strings
    isCollection : items => [...items].flatMap(renderNode),
    // text nodes (string/number)
    fallback : text => [document.createTextNode(String(text))],
  });
}

// EXTEND SHIFT

import { resolve as baseResolve } from './is.js';

function matchCases(target, cases, customPredicates = {}) {
  for (const [key, handler] of Object.entries(cases)) {
    if (key === 'fallback' || key === 'default' || key === '_') continue;

    // Check custom local predicates first, then fall back to @pulgasari/is
    const predicate = customPredicates[key] ?? baseResolve(key);

    if (predicate(target)) {
      return typeof handler === 'function' ? handler(target) : handler;
    }
  }

  const fallback = cases.fallback ?? cases.default ?? cases._;
  return typeof fallback === 'function' ? fallback(target) : fallback;
}

export function shift(target, cases) {
  if (arguments.length >= 2) return matchCases(target, cases);
  return (casesObject) => matchCases(target, casesObject);
}

// Bind custom local predicates to a new shift instance
shift.with = (customPredicates) => {
  const customShift = (target, cases) => {
    if (arguments.length >= 2) return matchCases(target, cases, customPredicates);
    return (casesObject) => matchCases(target, casesObject, customPredicates);
  };
  customShift.from = (cases) => (target) => matchCases(target, cases, customPredicates);
  return customShift;
};

// USAGE EXAMPLE

import { isArray, isString, isNullish, and, has } from '@pulgasari/is';
import { shift } from './shift.js';

// 1. Define custom reusable predicates upfront using @pulgasari/is helpers
const hasLength = (len) => has.length(len); // or: v => v?.length === len

const isTripleArray = and(isArray, hasLength(3));
const isStringOrNull = or(isString, isNullish);

// 2. Bind custom predicates to shift
const myShift = shift.with({
  isTripleArray,
  isStringOrNull,
});

// 3. Clean object matching with domain-specific terms
function process (target) {
  return myShift(target, {
    isTripleArray  : (arr) => `Vector 3D: ${arr.join(', ')}`,
    isStringOrNull : () => 'String or empty',
    isArray        : (arr) => `Array with ${arr.length} elements`,
    fallback       : () => 'Other',
  });
}

process([10, 20, 30]); // "Vector 3D: 10, 20, 30"


