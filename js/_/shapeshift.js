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
