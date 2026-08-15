// is.js

import * as preds from './predicates.js';

const
and = (...preds) => v => preds.every(p => p(v)),
or  = (...preds) => v => preds.some(p => p(v)),
not = pred       => v => !pred(v);

// pattern matcher
const testRule = (rule, value) => {
  if (typeof rule === 'function') return rule(value);
  if (typeof rule === 'boolean')  return rule;
  if (Array.isArray(rule))        return rule.every(r => testRule(r, value));
  return false;
};

const upperFirst = s => s.charAt(0).toUpperCase() + s.slice(1);

// module namespace objects have a null prototype, so a plain lookup
// cannot hit inherited keys like 'constructor'.
const resolve = p => {
  if (typeof p === 'function') return p;

  const fn = preds[p] ?? preds['is' + upperFirst(p)];
  if (!fn) throw new TypeError(`unknown predicate: ${p}`);

  return fn;
};

const
// an empty list returns false everywhere, instead of the vacuous true
// every() would give — a forgotten argument must not confirm anything.
is    = (value, ...list) => list.length > 0 && list.every(p => !!resolve(p)(value)),     
isNot = (value, ...list) => list.length > 0 && list.every(p =>  !resolve(p)(value)),
isAny = (value, ...list) => list.some(p => !!resolve(p)(value));

// :::::: EXPORTS

export * from './predicates.js';
export { and, or, not, testRule };
export { is, isAny, isNot };

