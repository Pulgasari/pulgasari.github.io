// @domina/core/internal/normalizeClasses.js

const CLASSES_SYMBOL = Symbol.for('domina.classes');

/**
 * Normalizes any input into a flat array of class strings.
 * Supports: 'a b', ['a', 'b'], { active: true, disabled: false }, DOMTokenList, and Custom Wrappers.
 */
export function _classes(...inputs) {
  const result = new Set();

  for (const input of inputs) {
    if (!input) continue;

    // 1. Strings: 'card active red' -> split by space
    if (typeof input === 'string') {
      input.trim().split(/\s+/).forEach(cls => cls && result.add(cls));
    }
    // 2. Arrays or DOMTokenList (el.classList): Iterate recursively
    else if (Array.isArray(input) || input instanceof DOMTokenList || input instanceof Set) {
      for (const item of input) {
        _classes(item).forEach(cls => result.add(cls));
      }
    }
    // 3. Custom Class Wrapper via Symbol
    else if (input[CLASSES_SYMBOL]) {
      _classes(input.classes ?? input.classList).forEach(cls => result.add(cls));
    }
    // 4. Objects: { active: true, hidden: false }
    else if (typeof input === 'object') {
      for (const [key, val] of Object.entries(input)) {
        if (val) _classes(key).forEach(cls => result.add(cls));
      }
    }
  }

  return [...result];
}

// @domina/core/internal/autocastClasses.js

import { _classes } from './normalizeClasses.js';

/**
 * Wraps a method so that any arguments after 'spec' are automatically normalized into clean class names.
 */
export function withClasses(fn) {
  return function (spec, ...classInputs) {
    const normalizedClasses = _classes(...classInputs);
    return fn.call(this, spec, normalizedClasses);
  };
}

                   // @domina/core/methods/addClass.js

import { _el } from '../internal/resolve.js';
import { withClasses } from '../internal/autocastClasses.js';

// The raw implementation only receives normalized string arrays!
function rawAddClass(spec, classes) {
  const element = _el(spec);
  if (!element || !classes.length) return element;

  element.classList.add(...classes);
  return element;
}

// Export the auto-casted version
export const addClass = withClasses(rawAddClass);
export default addClass;




import { addClass } from '@domina/core/methods';

const btn = document.querySelector('#btn');

// 1. Space-separated String
addClass(btn, 'btn-primary active');

// 2. Array of Strings
addClass(btn, ['btn-primary', 'active']);

// 3. Object syntax (like Vue/React)
addClass(btn, { active: true, hidden: false });

// 4. Copy classes from another element's classList
const otherEl = document.querySelector('#other');
addClass(btn, otherEl.classList);

// 5. Mixed wild combination
addClass(btn, 'btn', ['active', 'bold'], { 'is-open': true });

