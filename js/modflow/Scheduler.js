// Scheduler.js

export class Scheduler {

  #timers = new Set;

  schedule(flow, callback) {

    if (typeof callback !== 'function') {
      throw new TypeError('Scheduler callback must be a function.');
    }

    if (flow === 'eager') {
      return callback();
    }

    if (flow === 'idle') {
      return this.#idle(callback);
    }

    if (flow === 'interaction') {
      return this.#interaction(callback);
    }

    if (typeof flow === 'number') {
      return this.#timeout(callback, flow);
    }

    // lazy should never be scheduled automatically
    if (flow === 'lazy') {
      return null;
    }

    return null;
  }

  #idle(callback) {

    if (
      typeof window !== 'undefined' &&
      typeof window.requestIdleCallback === 'function'
    ) {
      return window.requestIdleCallback(
        () => callback(),
        { timeout: 2000 }
      );
    }

    return this.#timeout(callback, 200);
  }

  #interaction(callback) {

    if (typeof window === 'undefined') {
      return this.#timeout(callback, 0);
    }

    // "interaction" means the first meaningful user interaction.
    const events = [
      'pointerdown',
      'keydown',
      'touchstart'
    ];

    let fired = false;

    const run = () => {

      if (fired) return;
      fired = true;

      for (const event of events) {
        window.removeEventListener(event, run, { capture: true });
      }

      callback();
    };

    for (const event of events) {
      window.addEventListener(
        event,
        run,
        { once: true, capture: true, passive: true }
      );
    }

    return () => {

      if (fired) return;

      fired = true;

      for (const event of events) {
        window.removeEventListener(
          event,
          run,
          { capture: true }
        );
      }
    };
  }

  #timeout(callback, delay) {

    const id = setTimeout(() => {

      this.#timers.delete(id);
      callback();

    }, Math.max(0, delay));

    this.#timers.add(id);

    return () => {
      clearTimeout(id);
      this.#timers.delete(id);
    };
  }

  clear() {

    for (const id of this.#timers) {
      clearTimeout(id);
    }

    this.#timers.clear();
  }

}
