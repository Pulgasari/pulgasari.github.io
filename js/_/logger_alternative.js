// ---------------------------------------------------------------------------
// alternative: chainable api -> logger.log('a').warn('b').groupEnd()
//
// tradeoff: every call goes through a wrapper defined in this file, so devtools
// point at logger.js instead of the calling line. mitigate by adding logger.js to
// the devtools ignore list (settings -> ignore list, or right click the filename
// in the console), which makes the next frame up show as the origin.
//
// to switch: replace #api above with the version below, and in the constructor
// swap the defineProperties call for:
//   Object.assign(this, this.#api((name) => this.#colors[name]));
//
// #api(pick) {
//   const write = (name) => (...args) => {
//     if (this.#on) console[METHODS[name]](...this.#tag(pick(name)), ...args);
//     return api;
//   };
//
//   const forward = (name) => (...args) => {
//     if (this.#on) console[name]?.(...args);
//     return api;
//   };
//
//   const group = (collapsed) => (label = '') => {
//     if (this.#on) console[collapsed ? 'groupCollapsed' : 'group'](...this.#tag(pick('log')), label);
//     return api;
//   };
//
//   const api = {
//     ...Object.fromEntries(Object.keys(METHODS).map((n) => [n, write(n)])),
//     ...Object.fromEntries(NATIVE.map((n) => [n, forward(n)])),
//     group: group(false),
//     groupCollapsed: group(true),
//     groupEnd: () => (this.#on && console.groupEnd(), api),
//     color: (color) => this.#api(() => color),
//   };
//
//   return api;
// }
// ---------------------------------------------------------------------------
