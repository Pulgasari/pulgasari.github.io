// url.js

import { isArray, isNullish, isString, isUrl } from './is.js';
import { arrayfied, toSlug } from './util.js';

// helper
let _slug = v => arrayfied(v).flatMap( x => isArray(x) ? x.map(toSlug) : toSlug(x) );

class Url {
  constructor (input) {
    this.instance = new URL( input?.toString() ?? window.location.href, window.location.origin );
    this._initHandlers();
  }

  _initHandlers(){
    //
    let T = this, 
        I = T.instance, 
       PN = I.pathname,
       SP = I.searchParams,
        P = T.path,
        S = P.segments,
        Q = T.query;
    // PATH
    this.path = {
      get segments()    { return PN.split('/').filter(Boolean); },
      set segments(arr) { PN = `/${arr.join('/')}`; },
      append   : (...a) => { S = [ ...S, ..._slug(a) ]; return P; },
      prepend  : (...a) => { S = [ ..._slug(a), ...S ]; return P; },
      add      : (...a) => (a.forEach( v => !P.has(v) && P.append(v) ), P),
      remove   : (...a) => { S = S.filter( s => !a.map(toSlug).includes(s) ); return P; },
      has      : v  => S.includes(toSlug(v)),
      toArray  : () => S,
      toString : () => PN,
    };
    // QUERY (proxyfied URL.searchParams)
    this.query = new Proxy({
      get      : k     => SP.get(k),
      set      : (k,v) => { isNullish(v) ? SP.delete(k) : SP.set(k,v); return Q; },
      clear    : ()    => { I.search = ''; return Q; },
      delete   : k     => (SP.delete(k), Q),
      toObject : ()    => Object.fromEntries(SP),
      toString : ()    => I.search,
    },{
      get : (t,k)   => (k in t) ? t[k] : t.get(k),
      set : (t,k,v) => (t.set(k,v), true)
    });
  }

  get full() { return this.instance.href; }
  clone()    { return new Url(this.full); }
  toString() { return this.full; }
};

// EXPORT
export let url = input => new Url(input);







// url.js
//
// Thin, chainable wrapper around the native URL / URLSearchParams API.
//
//   const u = url('/blog?page=2');
//   u.path.append('My Post');      // -> /blog/my-post
//   u.query.set('page', null);     // -> removes ?page
//   u.toString();                  // -> https://example.com/blog/my-post

import { isNullish } from './is.js';
import { arrayfied, toSlug } from './util.js';

/** Flattens mixed args (values, arrays of values) into a flat list of slugs. */
const toSlugs = (values) => arrayfied(values).flat(Infinity).map(toSlug);

/** Current document location, or undefined outside the browser. */
const currentHref = () =>
  typeof window === 'undefined' ? undefined : window.location.href;

/**
 * Path segment handling.
 * Always reads from and writes to the live URL instance — no cached state.
 */
class UrlPath {
  #url;

  constructor(url) {
    this.#url = url;
  }

  /** @returns {string[]} path segments without empty entries */
  get segments() {
    return this.#url.pathname.split('/').filter(Boolean);
  }

  set segments(segments) {
    this.#url.pathname = `/${segments.join('/')}`;
  }

  /** Appends the given values as slugified segments. */
  append(...values) {
    this.segments = [...this.segments, ...toSlugs(values)];
    return this;
  }

  /** Prepends the given values as slugified segments. */
  prepend(...values) {
    this.segments = [...toSlugs(values), ...this.segments];
    return this;
  }

  /** Like append(), but skips segments that are already present. */
  add(...values) {
    const segments = this.segments;

    for (const segment of toSlugs(values)) {
      if (!segments.includes(segment)) segments.push(segment);
    }

    this.segments = segments;
    return this;
  }

  /** Removes every occurrence of the given segments. */
  remove(...values) {
    const removable = new Set(toSlugs(values));
    this.segments = this.segments.filter((segment) => !removable.has(segment));
    return this;
  }

  has(value) {
    return this.segments.includes(toSlug(value));
  }

  toArray() {
    return this.segments;
  }

  toString() {
    return this.#url.pathname;
  }
}

/**
 * Property-access view over the query parameters.
 *
 * The proxy target is an empty null-prototype object: it carries no methods
 * and no inherited members, so every string key is data and nothing can be
 * shadowed. The API lives on UrlQuery, not in here.
 *
 *   const q = url('?page=2').query.values;
 *   q.page;          // '2'
 *   q.sort = 'asc';  // sets ?sort=asc
 *   q.page = null;   // removes ?page
 *   delete q.sort;
 *   'page' in q;     // false
 *   { ...q };        // { sort: 'asc' }
 */
const createQueryView = (url) => {
  const params = () => url.searchParams;

  return new Proxy(Object.create(null), {
    get(_target, key) {
      // Keys are always strings, so symbols can never be data.
      if (key === Symbol.toPrimitive) return () => url.search;
      if (typeof key === 'symbol') return undefined;

      return params().get(key) ?? undefined;
    },

    set(_target, key, value) {
      if (typeof key === 'symbol') return false;

      if (isNullish(value)) params().delete(key);
      else params().set(key, String(value));

      return true;
    },

    has: (_target, key) => typeof key !== 'symbol' && params().has(key),

    deleteProperty(_target, key) {
      params().delete(key);
      return true;
    },

    ownKeys: () => [...new Set(params().keys())],

    getOwnPropertyDescriptor: (_target, key) =>
      typeof key !== 'symbol' && params().has(key)
        ? {
            value: params().get(key),
            writable: true,
            enumerable: true,
            configurable: true,
          }
        : undefined,
  });
};

/**
 * Query parameter handling.
 * Explicit methods instead of a Proxy, so parameters named "get", "set" or
 * "toString" cannot shadow the API.
 */
class UrlQuery {
  #url;
  #values;

  constructor(url) {
    this.#url = url;
  }

  /** @returns {URLSearchParams} live params of the underlying URL */
  get params() {
    return this.#url.searchParams;
  }

  /** @returns {Record<string, string>} collision-free property view */
  get values() {
    return (this.#values ??= createQueryView(this.#url));
  }

  get(key) {
    return this.params.get(key);
  }

  /** @returns {string[]} all values of a repeated parameter */
  getAll(key) {
    return this.params.getAll(key);
  }

  has(key) {
    return this.params.has(key);
  }

  /** Sets a parameter. A nullish value removes it. */
  set(key, value) {
    if (isNullish(value)) this.params.delete(key);
    else this.params.set(key, String(value));

    return this;
  }

  /** Sets many parameters at once: query.assign({ page: 2, sort: null }) */
  assign(values) {
    for (const [key, value] of Object.entries(values)) this.set(key, value);
    return this;
  }

  delete(key) {
    this.params.delete(key);
    return this;
  }

  clear() {
    this.#url.search = '';
    return this;
  }

  toObject() {
    return Object.fromEntries(this.params);
  }

  toString() {
    return this.#url.search;
  }

  [Symbol.iterator]() {
    return this.params[Symbol.iterator]();
  }
}

class Url {
  /**
   * @param {string|URL|{toString():string}} [input] absolute or relative URL,
   *        defaults to the current document location
   * @param {string|URL} [base] base for relative inputs, defaults to the
   *        current document location
   */
  constructor(input, base = currentHref()) {
    this.instance = new URL(input?.toString() ?? base, base);
    this.path     = new UrlPath(this.instance);
    this.query    = new UrlQuery(this.instance);
  }

  get full() {
    return this.instance.href;
  }

  set full(value) {
    this.instance.href = new URL(value, this.instance).href;
  }

  get origin() {
    return this.instance.origin;
  }

  get hash() {
    return this.instance.hash;
  }

  set hash (value) {
    this.instance.hash = value;
  }

  clone() {
    return new Url(this.full);
  }

  toString() {
    return this.full;
  }
}

export { Url };
export const url = (input, base) => new Url(input, base);
