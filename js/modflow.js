// modflow.js

class Modflow {
  cache       = new Map;
  definitions = new Map;

  define (config) {
    Object.entries(config).forEach(([name, options]) => {
      // normalize string input to object configuration
      const opts = typeof options === 'string' ? { url: options } : options;
      const flow = opts.flow ?? 'eager';

      this.definitions.set (name, { ...opts, flow });

      // handle background strategies
      if (typeof flow === 'number') {
        setTimeout(() => this.#load(name), strategy);
      } else if (flow === 'idle') {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => this.#load(name));
        } else {
          setTimeout(() => this.#load(name), 200);
        }
      } else if (flow === 'eager') {
        this.#load(name);
      }

      /*
      if (opts.delay) setTimeout(() => this.#load(name), opts.delay);
      else switch (strategy) {
        case 'idle' : return requestIdleCallback?.(() => this.#load(name)) ?? setTimeout (() => this.#load(name), 200);     
        case 'eager': return this.#load(name);
      }
      */
      
      // note: 'lazy' strategy does nothing here - it waits for property access
    });
  }

  #load = async (name) => {
    if (this.cache.has(name)) return this.cache.get(name);

    const def = this.definitions.get(name);
    if (!def) throw new Error(`Module "${name}" was not defined in mod.define()`);

    // store the loading promise immediately to handle concurrent access
    const promise = import(def.url).then((module) => {
      // normalize ESM default vs named exports
      const resolved = module.default && Object.keys(module).length === 1 ? module.default : module;
      this.cache.set(name, resolved);
      return resolved;
    });

    this.cache.set(name, promise);
    return promise;
  }

  createProxy = () => new Proxy (this, {
    get: (target, prop) => {
      // direct access to internal methods like mod.define()
      if (prop in target || typeof prop === 'symbol') {
        return target[prop];
      }

      // if module is already completely loaded ...
      // -> return synchronously 
      const cached = target.cache.get(prop);
      if (cached && !(cached instanceof Promise)) return cached;
        
      // ... otherwise
      // -> fetch module and wrap in a lazy stub proxy
      const loadPromise = target.#load(prop);
      return target.#createStub(loadPromise);
    }
  });

  #createStub = (loadPromise) => new Proxy (() => {}, {
      // intercepts property access on a LAZY module
      get: (_, method) => {
        return (...args) => loadPromise.then((mod) => {
          const fn = mod[method] || mod;
          return typeof fn === 'function' ? fn(...args) : fn;
        });
      },
    
      // intercepts direct function call on a LAZY module
      apply: (_, __, args) => {
        return loadPromise.then((module) => {
          const fn = typeof module === 'function' ? module : module.default;
          return fn(...args);
        });
      }
    });
  
}

// global init
window.mod = new Modflow().createProxy();

/*
// config definition at top-level
mod.define({
  moduleName1 : '/moduleName1.js',                            // eager load (default)
  moduleName2 : { strategy: 'idle', url: '/moduleName2.js' }, // load on browser idle
  moduleName3 : { strategy: 5000,   url: '/moduleName3.js' }, // load after 5000ms delay
  moduleName4 : { strategy: 'lazy', url: '/moduleName4.js' }, // load on first usage
});


// accessing properties creates a proxy stub immediately
const { doSth } = mod.blabla;

// call executes seamlessly as soon as the lazy script arrives
doSth('Hello World');
*/
