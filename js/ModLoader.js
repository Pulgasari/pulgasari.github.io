class ModLoader {
  constructor() {
    this.definitions = new Map();
    this.cache = new Map();
  }

  define(config) {
    Object.entries(config).forEach(([name, options]) => {
      // Normalize string input to object configuration
      const opts = typeof options === 'string' ? { url: options } : options;
      const strategy = opts.strategy || (opts.delay ? 'delayed' : 'eager');

      this.definitions.set(name, { ...opts, strategy });

      // Handle background strategies
      if (opts.delay) {
        setTimeout(() => this._load(name), opts.delay);
      } else if (strategy === 'idle') {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => this._load(name));
        } else {
          setTimeout(() => this._load(name), 200);
        }
      } else if (strategy === 'eager') {
        this._load(name);
      }
      // Note: 'lazy' strategy does nothing here - it waits for property access
    });
  }

  async _load(name) {
    if (this.cache.has(name)) return this.cache.get(name);

    const def = this.definitions.get(name);
    if (!def) throw new Error(`Module "${name}" was not defined in mod.define()`);

    // Store the loading promise immediately to handle concurrent access
    const promise = import(def.url).then((module) => {
      // Normalize ES Module default vs named exports
      const resolved = module.default && Object.keys(module).length === 1 ? module.default : module;
      this.cache.set(name, resolved);
      return resolved;
    });

    this.cache.set(name, promise);
    return promise;
  }

  createProxy() {
    return new Proxy(this, {
      get: (target, prop) => {
        // Direct access to internal methods like mod.define()
        if (prop in target || typeof prop === 'symbol') {
          return target[prop];
        }

        // Return synchronously if module is already completely loaded
        const cached = target.cache.get(prop);
        if (cached && !(cached instanceof Promise)) {
          return cached;
        }

        // Fetch module and wrap in a lazy stub proxy
        const loadPromise = target._load(prop);
        return target._createStub(loadPromise);
      }
    });
  }

  _createStub(loadPromise) {
    return new Proxy(() => {}, {
      get: (_, method) => {
        // Intercepts property access on the lazy module (e.g., mod.blabla.doSth)
        return (...args) => loadPromise.then((mod) => {
          const fn = mod[method] || mod;
          return typeof fn === 'function' ? fn(...args) : fn;
        });
      },
      apply: (_, __, args) => {
        // Intercepts direct function call on the lazy module (e.g., mod.blabla())
        return loadPromise.then((mod) => {
          const fn = typeof mod === 'function' ? mod : mod.default;
          return fn(...args);
        });
      }
    });
  }
}

// Global initialization
const modInstance = new ModLoader();
window.mod = modInstance.createProxy();

/*
// Config definition at top-level
mod.define({
  preact: '/assets/preact.js',                                 // Eager load (default)
  heavyLib: { url: '/assets/heavy.js', strategy: 'idle' },     // Load on browser idle
  andereLib: { url: '/assets/other.js', delay: 5000 },         // Load after 5s
  blabla: { url: '/assets/blabla.js', strategy: 'lazy' }       // Load on first usage
});

// Accessing properties creates a proxy stub immediately
const { doSth } = mod.blabla;

// Call executes seamlessly as soon as the lazy script arrives
doSth('Hello World');
*/
