// core.js

export const
and = (...preds) => v => preds.every(p => p(v)),
or  = (...preds) => v => preds.some(p => p(v)),
not = pred       => v => !pred(v);

// pattern matcher
export const testRule = (rule, value) => {
  if (typeof rule === 'function') return rule(value);
  if (typeof rule === 'boolean')  return rule;
  if (Array.isArray(rule))        return rule.every(r => testRule(r, value));
  return false;
};
