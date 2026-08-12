// logger.js
// minimal console wrapper: prefix, named colors, groups, tables, optional debug gating.
// styling goes through %c in browsers and ansi truecolor in node

const IS_NODE = !!globalThis.process?.versions?.node;
// node only: respect NO_COLOR and piped/redirected output
const NO_ANSI = IS_NODE && (!!process.env.NO_COLOR || !process.stdout?.isTTY);

// api method -> console method
const METHODS = { log: 'log', warn: 'warn', error: 'error', success: 'log' };

const COLORS = {
  red: '#ff5555',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  blue: '#3b82f6',
  cyan: '#06b6d4',
  purple: '#a855f7',
  gray: '#888888',
};

const DEFAULTS = { log: 'gray', warn: 'orange', error: 'red', success: 'green' };

// one value for every method
const mapAll = (color) => Object.fromEntries(Object.keys(METHODS).map((n) => [n, color]));

// #rgb | #rrggbb -> "r;g;b"
const rgb = (hex) => {
  const h    = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(';');
};

export default class Logger {
  #colors; #gated; #palette; prefix;

  // `debugger` is a reserved word -> renamed while destructuring.
  // color: one value for all methods, or a per-method map { log, warn, error, success }
  // colors: extends the named palette, same key overrides
  constructor({ color, colors, prefix = '', debugger: gated = false } = {}) {
    this.#prefix = prefix;
    this.#gated = gated;
    this.#palette = { ...COLORS, ...colors };
    this.#colors = { ...DEFAULTS, ...(typeof color === 'string' ? mapAll(color) : color) };

    // default api lands directly on the instance -> logger.log(...)
    Object.assign(this, this.#api((name) => this.#colors[name]));
  }

  // read at call time, so flipping globalThis.DEBUG at runtime takes effect
  get #on() {
    return !this.#gated || globalThis.DEBUG === true;
  }

  // palette name or a raw value, unknown names pass through untouched
  #hex(color) {
    return this.#palette[color] ?? color;
  }

  // leading console args for the current environment
  #tag(color) {
    if (!this.#prefix) return [];
    const hex = this.#hex(color);
    if (!IS_NODE) return [`%c${this.#prefix}`, `color:${hex};font-weight:bold`];
    // ansi needs real rgb values, so css color names stay unstyled here
    return NO_ANSI || !hex.startsWith('#')
      ? [this.#prefix]
      : [`\x1b[1;38;2;${rgb(hex)}m${this.#prefix}\x1b[0m`];
  }

  // builds the whole api around a picker: (method name) => color
  #api(pick) {
    const write = (name) => (...args) => {
      if (this.#on) console[METHODS[name]](...this.#tag(pick(name)), ...args);
      return api;
    };

    // opens a group, closed by groupEnd(). nesting handles the console itself
    const group = (collapsed) => (label = '') => {
      if (this.#on) console[collapsed ? 'groupCollapsed' : 'group'](...this.#tag(pick('log')), label);
      return api;
    };

    const api = {
      ...Object.fromEntries(Object.keys(METHODS).map((n) => [n, write(n)])),
      group: group(false),
      groupCollapsed: group(true),
      groupEnd: () => (this.#on && console.groupEnd(), api),
      // one-off color for a whole chain: logger.color('red').log(...)
      color: (color) => this.#api(() => color),
      // console.table ignores styling, so the prefix rides in a wrapping group
      table: (data, columns) => {
        if (!this.#on) return api;
        if (!this.#prefix) return (console.table(data, columns), api);
        console.group(...this.#tag(pick('log')));
        console.table(data, columns);
        console.groupEnd();
        return api;
      },
    };

    return api;
  }
}
