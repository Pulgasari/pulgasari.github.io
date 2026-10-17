// @aufbau/api

import { deepMerge } from '@pulgasari/obj';
//import { shift }     from '@pulgasari/shapeshift';
  
import { CSS_PATH, gestalt } from '@aufbau/gestalt';

// :::::: LAZY ::::::::::::::::::::::::::::::::::::::::::::::::::

const CONTRACT = ['apply', 'list', 'load', 'remove', 'update', 'use'];
const facade   = (load, names) => Object.fromEntries(names.map(name => [name, async (...args) => (await load())[name](...args)]));
const once     = (load)        => { let promise; return () => promise ??= load(); };
const lazy     = (load, name)  => async (...args) => (await load())[name](...args);

const modules = {
  config   : once(() => import('@aufbau/element')),
  domina   : name    => import(`@domina/methods/${name}.js`).then(module => module[name] ?? module.default),
  elements : once(() => import('@aufbau/elements')),
  filters  : once(() => import('@aufbau/filters')),
  icons    : once(() => import('@aufbau/svg/aliases.js')),
  patterns : once(() => import('@aufbau/patterns')),
  webfonts : once(() => import('@aufbau/webfonts')),
//$load    : (name)  => modules[name]().then(module => module.data),
};

// :::::: NAMESPACES ::::::::::::::::::::::::::::::::::::::::::::

const filters  = facade(modules.filters , [...CONTRACT, 'createPipeline', 'supports']);
const patterns = facade(modules.patterns, CONTRACT);
const webfonts = facade(modules.webfonts, [...CONTRACT, 'configure', 'init']);

const elements = {
  getConfig      : async (...args) => (await modules.config()).getConfig(...args),
  setConfig      : async (...args) => (await modules.config()).setConfig(...args),
  
  enableAutoload : async (options) => (await modules.elements()).autoloader(options),
  load           : async (tag)     => (await modules.elements()).load(tag),
  registerAll    : async ()        => (await modules.elements()).registerAll(),
  
};

/*
const elements = {
  getConfig      : lazy(modules.config, 'getConfig'),
  setConfig      : lazy(modules.config, 'setConfig'),
  enableAutoload : lazy(modules.elements, 'autoloader'),
  load           : lazy(modules.elements, 'load'),
  registerAll    : lazy(modules.elements, 'registerAll'),
};
*/


// catalogues, each one a promise
const data = {
  /*
  get filters  () { return modules.$load('filters');  },
  get patterns () { return modules.$load('patterns'); },
  get webfonts () { return modules.$load('webfonts'); },
  */
  
  get filters  () { return modules.filters ().then(module => module.data); },
  get icons    () { return modules.icons   ().then(module => module.default); },
  get palettes () { return gestalt.palettes(); },
  get patterns () { return modules.patterns().then(module => module.data); },
  get webfonts () { return modules.webfonts().then(module => module.data); },
};

// RS: MapStore, SetStore 
//const viewport = new CanonicalMap ({ width: 'device-width', initialScale: '1.0', userScalable: 'no' });

const dom = {
  adoptStyleSheet : async (...args) => (await modules.domina('adoptStyleSheet'))(...args),
  getStyleToken   : async (...args) => (await modules.domina('getStyleToken'))(...args),
  setStyleToken   : async (...args) => (await modules.domina('setStyleToken'))(...args),
  //viewport
};

// :::::: COMBINED ::::::::::::::::::::::::::::::::::::::::::::::

// the keys of aufbau.apply() and friends
const KINDS = { filter: filters, font: webfonts, pattern: patterns };

const kindOf = (key) => {
  if (!KINDS[key]) throw new Error(`[@aufbau/api] unknown kind "${key}", expected ${Object.keys(KINDS).join(', ')}`);
  return KINDS[key];
};

// 'dots' | { id: 'dots', ...options } | ['dots', options]
const entryOf = (value) =>
    typeof value === 'string' ? [value, {}]
  : Array.isArray(value)      ? [value[0], value[1] ?? {}]
  : (({ id, ...options }) => [id, options])(value);

/*
const entryOf = shift.from ({
  string   : (value) => [value, {}],
  array    : (value) => [value[0], value[1] ?? {}],
  fallback : (({ id, ...options }) => [id, options]),
});
*/

/** applies several kinds at once, null removes one: { filter, font, pattern } */
const apply = (target, spec = {}) => Promise.all(Object.entries(spec).map(([key, value]) =>
  value == null ? kindOf(key).remove(target) : kindOf(key).apply(target, ...entryOf(value))
));

/** changes the options of what is already applied: { pattern: { fg: '#0f0' } } */
const update = (target, spec = {}) => Promise.all(Object.entries(spec).map(([key, options]) => kindOf(key).update(target, options)));

/** removes the given kinds, all of them by default */
const remove = (target, keys = Object.keys(KINDS)) => Promise.all(keys.map(key => kindOf(key).remove(target)));

// :::::: BOOT ::::::::::::::::::::::::::::::::::::::::::::::::::

const config = {
  // reset is css/aufbau.css, which brings the gestalt tokens and the palettes along.
  // false when the page links it itself. the rest goes through gestalt
  css : {
    layout  : false,
    look    : 'flat',
    mode    : null,
    palette : null,
    reset   : true,
    skin    : 'monochrome',
  },

  // mode: 'auto' | 'all' | false. every other key is element config, e.g. { 'write-code': { theme: 'nord' } }
  elements : {
    mode : 'auto',
  },

  font : ['manrope'],
};

// a real <link>: aufbau.css imports its parts into layers, and an adopted
// (constructed) sheet cannot carry @import. first in <head>, the page's own
// sheets come after it. resolves once it is loaded, at once when it is there
function linkStylesheet (href) {
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = Object.assign(document.createElement('link'), { href, onerror: reject, onload: resolve, rel: 'stylesheet' });
    document.head.prepend(link);
  });
}

let booted = false;

const setConfig = (options = {}) => deepMerge(config, options);

async function boot (options = {}) {
  setConfig(options);
  if (booted || typeof window === 'undefined') return booted;
  booted = true;

  const { css: { layout, look, mode: scheme, palette, reset, skin }, elements: { mode, ...defaults }, font } = config;

  // aufbau.css first, the gestalt sheets after it
  if (reset) await linkStylesheet(`${CSS_PATH}/aufbau.css`);

  if (Object.keys(defaults).length) await elements.setConfig(defaults);

  await Promise.all([
    gestalt.set({ layout, look, mode: scheme, skin, ...(palette && { palette }) }),
    mode === 'auto' && elements.enableAutoload(),
    mode === 'all'  && elements.registerAll(),
    font && webfonts.init(font),
  ]);

  return booted;
}

// :::::: EXPORT ::::::::::::::::::::::::::::::::::::::::::::::::

const aufbau = {
  apply,
  boot,
  config,
  data,
  dom,
  elements,
  filters,
  gestalt,
  patterns,
  remove,
  setConfig,
  update,
  webfonts,
};

export { apply, boot, config, data, dom, elements, filters, gestalt, patterns, remove, setConfig, update, webfonts };
export default aufbau;
