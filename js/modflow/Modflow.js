// Modflow.js

import { createModuleProxy as createProxy } from './proxy.js';
import { ModflowUnknownModuleError.} from './errors.js';
import { normalizeDefinition } from './normalize.js';
import { Scheduler } from './Scheduler.js';

export class Modflow {

  definitions = new Map;
  entries     = new Map;
  scheduler   = new Scheduler;

  constructor (options = {}) {

    this.config = {
      preloadStrategy : options.preloadStrategy ?? 'modulepreload',
      debug           : options.debug           ?? false,
      onError         : options.onError         ?? null,
      onEvent         : options.onEvent         ?? null,
    };
  }


  // ─────────────────────────────────────────────
  // DEFINE
  // ─────────────────────────────────────────────

  define(config = {}) {

    if (
      config === null ||
      typeof config !== 'object'
    ) {
      throw new TypeError(
        'mod.define() requires an object.'
      );
    }

    for (const [name, input] of Object.entries(config)) {

      const definition = normalizeDefinition(name, input);

      this.definitions.set(
        name,
        definition
      );

      this.#ensureEntry(name);

      this.#emit('defined', {
        name,
        definition,
      });

      /*
       * Schedule automatic flows.
       */
      if (definition.flow !== 'lazy') {
        this.#schedule(name);
      }

      /*
       * Explicit preload.
       */
      if (definition.preload) {
        this.preload(name);
      }
    }

    return this;
  }


  // ─────────────────────────────────────────────
  // HAS
  // ─────────────────────────────────────────────

  has(name) {
    return this.definitions.has(name);
  }


  // ─────────────────────────────────────────────
  // LOAD
  // ─────────────────────────────────────────────

  load (name) {

    const definition = this.definitions.get(name);

    if (!definition) {
      return Promise.reject(
        new ModflowUnknownModuleError(name)
      );
    }

    const entry = this.#ensureEntry(name);

    /*
     * Already fully loaded.
     */
    if (entry.state === 'loaded') {
      return Promise.resolve(
        entry.value
      );
    }

    /*
     * Already loading.
     *
     * This is the important concurrency guarantee:
     *
     * 20 callers → 1 import()
     */
    if (entry.promise) {
      return entry.promise;
    }

    /*
     * Mark before loading dependencies.
     */
    entry.state     = 'loading';
    entry.startedAt = performance.now();

    this.#emit('loading', {
      name,
      definition,
    });

    entry.promise =
      this.#loadWithDependencies(
        name,
        definition
      )
      .then(module => {

        const resolved = normalizeModule(module);

        entry.value    = resolved;
        entry.state    = 'loaded';
        entry.loadedAt = performance.now();
        entry.duration = entry.loadedAt - entry.startedAt;

        this.#emit('loaded', {
          name,
          definition,
          value: resolved,
          duration: entry.duration,
        });

        return resolved;
      })
      .catch(error => {

        entry.state      = 'failed';
        entry.error      = error;
        entry.finishedAt = performance.now();

        this.#emit('failed', {
          name,
          definition,
          error,
        });

        /*
         * Important:
         * failed modules must be retryable.
         */
        entry.promise = null;

        throw error;
      });

    return entry.promise;
  }


  // ─────────────────────────────────────────────
  // PRELOAD
  // ─────────────────────────────────────────────

  preload(name) {

    const definition = this.definitions.get(name);

    if (!definition) {
      return Promise.reject(
        new ModflowUnknownModuleError(name)
      );
    }

    /*
     * browser modulepreload:
     *
     * fetch + prepare the module,
     * but do not execute it yet.
     */
    if (
      typeof document !== 'undefined' &&
      this.config.preloadStrategy === 'modulepreload'
    ) {

      const href =
        this.#resolveURL(definition.url);

      if (!this.#hasPreload(href)) {

        const link = document.createElement('link');

        link.rel = 'modulepreload';
        link.href = href;

        document.head.appendChild(link);

        this.#emit('preloaded', {
          name,
          href,
        });
      }
    }

    return this;
  }


  // ─────────────────────────────────────────────
  // PREFETCH
  // ─────────────────────────────────────────────

  prefetch(name) {

    const definition =
      this.definitions.get(name);

    if (!definition) {
      return Promise.reject(
        new ModflowUnknownModuleError(name)
      );
    }

    if (typeof document === 'undefined') {
      return Promise.resolve();
    }

    const href =
      this.#resolveURL(definition.url);

    if (!this.#hasPreload(href, 'prefetch')) {

      const link =
        document.createElement('link');

      link.rel = 'prefetch';
      link.as = 'script';
      link.href = href;

      document.head.appendChild(link);

      this.#emit('prefetched', {
        name,
        href,
      });
    }

    return this;
  }


  // ─────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────

  state(name) {

    const entry =
      this.entries.get(name);

    if (!entry) {
      return null;
    }

    return {
      name,

      state       : entry.state,

      startedAt   : entry.startedAt,
      loadedAt    : entry.loadedAt,
      duration    : entry.duration,

      hasValue    : entry.value !== undefined,
      hasPromise  : !!entry.promise,

      error       : entry.error ?? null,
    };
  }


  // ─────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────

  stats() {

    const output = {};

    for (const name of this.definitions.keys()) {
      output[name] =
        this.state(name);
    }

    return output;
  }


  // ─────────────────────────────────────────────
  // RETRY
  // ─────────────────────────────────────────────

  retry(name) {

    const entry =
      this.entries.get(name);

    if (!entry) {
      return this.load(name);
    }

    entry.promise = null;
    entry.error = null;
    entry.state = 'defined';

    return this.load(name);
  }


  // ─────────────────────────────────────────────
  // INVALIDATE
  // ─────────────────────────────────────────────

  invalidate(name) {

    const entry =
      this.entries.get(name);

    if (!entry) return;

    entry.value = undefined;
    entry.promise = null;
    entry.error = null;

    entry.state = 'defined';
    entry.startedAt = null;
    entry.loadedAt = null;
    entry.duration = null;
  }


  // ─────────────────────────────────────────────
  // SCHEDULING
  // ─────────────────────────────────────────────

  #schedule(name) {

    const definition =
      this.definitions.get(name);

    if (!definition) return;

    this.scheduler.schedule(
      definition.flow,
      () => this.load(name).catch(error => {

        if (this.config.debug) {
          console.warn(
            `[modflow] failed to load "${name}"`,
            error
          );
        }

        this.config.onError?.(
          error,
          definition
        );
      })
    );
  }


  // ─────────────────────────────────────────────
  // DEPENDENCIES
  // ─────────────────────────────────────────────

  async #loadWithDependencies(
    name,
    definition
  ) {

    if (definition.deps?.length) {

      await Promise.all(
        definition.deps.map(
          dep => this.load(dep)
        )
      );
    }

    return this.#import(
      definition
    );
  }


  // ─────────────────────────────────────────────
  // IMPORT
  // ─────────────────────────────────────────────

  #import(definition) {

    let promise =
      import(
        /* @vite-ignore */
        definition.url
      );

    if (definition.timeout > 0) {

      promise =
        withTimeout(
          promise,
          definition.timeout,
          definition.name
        );
    }

    return promise;
  }


  // ─────────────────────────────────────────────
  // ENTRY
  // ─────────────────────────────────────────────

  #ensureEntry(name) {

    let entry =
      this.entries.get(name);

    if (!entry) {

      entry = {

        state       : 'defined',

        value       : undefined,
        promise     : null,
        error       : null,

        startedAt   : null,
        loadedAt    : null,
        duration    : null,
      };

      this.entries.set(
        name,
        entry
      );
    }

    return entry;
  }


  // ─────────────────────────────────────────────
  // URL
  // ─────────────────────────────────────────────

  #resolveURL(url) {

    if (
      typeof window === 'undefined'
    ) {
      return url;
    }

    return new URL(
      url,
      document.baseURI
    ).href;
  }


  #hasPreload(href, rel = 'modulepreload') {

    if (typeof document === 'undefined') {
      return false;
    }

    return !!document.querySelector(
      `link[rel="${rel}"][href="${CSS.escape(href)}"]`
    );
  }


  // ─────────────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────────────

  #emit(type, data) {

    this.config.onEvent?.({
      type,
      time: performance.now(),
      ...data,
    });
  }


  // ─────────────────────────────────────────────
  // PROXY
  // ─────────────────────────────────────────────

  proxy() {
    return createProxy(this);
  }

}
