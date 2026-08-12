// timing.js

export const debounce = (callback, delay = 100) => {
  let timer = null;

  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; callback(...args); }, delay);
  };

  debounced.cancel = () => { clearTimeout(timer); timer = null; };
  return debounced;
};

/*
  runs work once the browser is not busy — for anything that must happen but must
  not compete with the critical path.

  `deadline` is not optional in spirit: without it an idle callback on a busy page
  can be postponed indefinitely, and work that never runs is worse than work that
  runs late. safari has no requestIdleCallback at all, hence the fallback.
*/
export const idle = (callback, deadline = 2000) =>
  typeof requestIdleCallback === 'function'
    ? requestIdleCallback(callback, { timeout: deadline })
    : setTimeout(callback, 1);

export const interval = (callback, delay = 1000) => {
  const id = setInterval(callback, delay);
  return () => clearInterval(id);
};

export const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

export const rafThrottle = (callback) => {
  let frame   = null;
  let pending = null;

  const throttled = (...args) => {
    pending = args;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => { frame = null; callback(...pending); });
  };

  throttled.cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = pending = null;
  };
  return throttled;
};

export const sleep = (duration = 0) => new Promise(resolve => setTimeout(resolve, duration));

export const throttle = (callback, delay = 100) => {
  let last    = 0;
  let timer   = null;
  let pending = null;

  const invoke = (args) => { last = Date.now(); pending = null; callback(...args); };

  const throttled = (...args) => {
    const remaining = delay - (Date.now() - last);
    pending = args;

    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      invoke(args);
    } else if (timer === null) {
      timer = setTimeout(() => { timer = null; if (pending) invoke(pending); }, remaining);
    }
  };

  throttled.cancel = () => { clearTimeout(timer); timer = null; pending = null; };
  return throttled;
};

export const timeout = (callback, delay = 0) => {
  const id = setTimeout(callback, delay);
  return () => clearTimeout(id);
};
