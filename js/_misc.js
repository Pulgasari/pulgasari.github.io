// @aufbau/kits/dom

// bridge between js values and css custom properties / dataset attributes.
// lifted 1:1 out of the old kit/index.js.
// TODO: this is generic dom tooling and should move to @aufbau/utils.

// :::::: HELPERS :::::::::::::::::::::::::::::::::::::::::::::::

const root = typeof document !== 'undefined' ? document.documentElement : null;

const prefixed    = (str, prefix) => (String(str).startsWith(prefix) ? String(str) : prefix + str);
const toWords     = (str) => String(str).replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/[-_.\s]+/g, ' ').trim().toLowerCase().split(' ').filter(Boolean);
const toCamelCase = (str) => toWords(str).map((word, i) => (i === 0 ? word : word[0].toUpperCase() + word.slice(1))).join('');
const toKebabCase = (str) => toWords(str).join('-');

// registry of known keys: camelKey -> { target, type }
const definitions = new Map();

// :::::: API :::::::::::::::::::::::::::::::::::::::::::::::::::

/**
 * registers a property or dataset mapping key.
 * @param {Object} options
 * @param {string} options.key
 * @param {HTMLElement} [options.target=document.documentElement]
 * @param {'dataset'|'property'} [options.type='property']
 */
export function define ({ key, target, type = 'property' }) {
  definitions.set(toCamelCase(key), { target: target ?? root, type });
}

/**
 * writes a css custom property (--kebab-key) on the target element.
 * @param {Object} options
 * @param {string} options.key
 * @param {any} options.value
 * @param {HTMLElement} [options.target]
 */
export function updateProperty ({ key, value, target }) {
  const el = target ?? definitions.get(toCamelCase(key))?.target ?? root;
  if (!el) return;
  el.style.setProperty(prefixed(toKebabCase(key), '--'), String(value));
}

/**
 * writes a data-* attribute on the target element.
 * @param {Object} options
 * @param {string} options.key
 * @param {any} options.value
 * @param {HTMLElement} [options.target]
 */
export function updateDataset ({ key, value, target }) {
  const el = target ?? definitions.get(toCamelCase(key))?.target ?? root;
  if (!el) return;
  el.dataset[toCamelCase(key)] = String(value);
}

/**
 * updates a registered key, dispatching to property or dataset based on define().
 * unregistered keys default to 'property'.
 * @param {Object} options
 * @param {string} options.key
 * @param {any} options.value
 * @param {HTMLElement} [options.target]
 */
export function update ({ key, value, target }) {
  const { type } = definitions.get(toCamelCase(key)) ?? { type: 'property' };
  return type === 'dataset'
    ? updateDataset  ({ key, value, target })
    : updateProperty ({ key, value, target });
}
