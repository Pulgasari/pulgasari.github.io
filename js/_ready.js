// @aufbau/js/ready.js

/*
  a one-shot boot barrier.

  producers register a named gate, consumers await all of them at once. it exists
  because nothing in aufbau announced readiness before: observeStylesheets()
  returns undefined, processStylesheets() throws away every promise it creates,
  and aufbau.init() resolves long before a single stylesheet has been compiled.

  two properties make it safe to hang a loading screen off:

    ready() never rejects  — a gate that throws is logged and counts as settled
    ready() never hangs    — the deadline resolves it either way

  a gate still pending when the deadline hits is reported as such, which is the
  whole value of the timeout path: it says WHAT it hung on rather than just that
  something did.
*/

import { createLogger }     from './log.js';
import { isFn }             from './is.js';
import { nextFrame, sleep } from './timing.js';

const gates = new Map; // name -> { promise, state: 'pending' | 'ok' | 'failed' }
const log   = createLogger('aufbau-ready');

let closed = false;

/**
 * registers a gate. takes a promise or a thunk returning one. a repeated name
 * is ignored, so a producer that runs twice does not reopen the barrier.
 */
export function gate (name, source) {
  if (closed) return log.debug(`gate "${name}" registered after ready() resolved, ignored`);
  if (gates.has(name)) return gates.get(name).promise;

  const entry = { promise: null, state: 'pending' };
  gates.set(name, entry);

  entry.promise = Promise.resolve(isFn(source) ? source() : source).then(
    ()      => { entry.state = 'ok'; },
    (error) => { entry.state = 'failed'; log.warn(`gate "${name}" failed:`, error); }
  );

  return entry.promise;
}

/** a snapshot of every gate. also the `gates` field of the ready() report */
export function readyState () {
  const state = {};
  for (const [name, entry] of gates) state[name] = entry.state;
  return state;
}

/**
 * resolves when every gate has settled or the deadline hits, whichever comes
 * first. `minimum` holds the resolution back so callers do not each reimplement
 * a floor of their own.
 */
export async function ready ({ minimum = 0, timeout = 8000 } = {}) {
  const started = performance.now();

  let expired = false;
  let expire  = null;

  const deadline = new Promise(resolve => {
    expire = setTimeout(() => { expired = true; resolve(); }, timeout);
  });

  // gates can still arrive while we are waiting — an app registers its own once
  // the kit is up — so keep draining until the set stops growing
  for (let size = -1; !expired && size !== gates.size; ) {
    size = gates.size;
    await Promise.race([Promise.all([...gates.values()].map(entry => entry.promise)), deadline]);
  }

  clearTimeout(expire);

  const waited = performance.now() - started;
  if (waited < minimum) await sleep(minimum - waited);

  closed = true;

  const state    = readyState();
  const values   = Object.values(state);
  const timedOut = values.includes('pending');

  return {
    elapsed : performance.now() - started,
    gates   : state,
    ok      : !timedOut && !values.includes('failed'),
    timedOut,
  };
}

/**
 * resolves when an open work set has drained AND stayed drained for one frame.
 *
 * the sets in @aufbau/plugins/client and @aufbau/elements are fed by
 * MutationObservers, so they can refill at any moment. a plain `size === 0`
 * check would pass at t=0, before the first item was ever queued.
 */
export async function quiescent (set) {
  do {
    while (set.size) await Promise.allSettled([...set]);
    await nextFrame();
  } while (set.size);
}
