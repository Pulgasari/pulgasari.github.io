// @aufbau/gestures/core.js
// pointer-driven gesture recognizers. every recognizer is a factory returning
// { handlers, style?, touchAction?, destroy?, set? }: `handlers` maps native event
// names to listeners and nothing binds itself, so the same factory works
// standalone, composed through gestures(), or behind a framework adapter (see
// adapters/). the composer is the only part that touches the dom.

// :::::: IMPORT

import { angle, angleDelta, clamp, distance, midpoint, snap } from './utils.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// nearest of a fixed set, or nearest multiple of a step, or the value untouched.
const snap = (value, steps) =>
    !steps               ? value
  : Array.isArray(steps) ? steps.reduce((prev, next) => Math.abs(next - value) < Math.abs(prev - value) ? next : prev)
  : Math.round(value / steps) * steps;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const angle    = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;

// signed shortest difference between two angles in degrees, in (-180, 180].
const angleDelta = (from, to) => { let d = (to - from) % 360; return d > 180 ? d - 360 : d <= -180 ? d + 360 : d; };

// wheel deltas normalized to pixels regardless of deltaMode (line/page), so
// zoom feels the same across browsers and input devices.
const WHEEL_LINE = 16;
const WHEEL_PAGE = 400;
const normalizeWheel = event => {
  const unit = event.deltaMode === 1 ? WHEEL_LINE : event.deltaMode === 2 ? WHEEL_PAGE : 1;
  return { deltaX: event.deltaX * unit, deltaY: event.deltaY * unit };
};

const MODIFIER = { ctrl: 'ctrlKey', meta: 'metaKey', shift: 'shiftKey', alt: 'altKey' };

const NO_SELECT = {
  userSelect         : 'none',
  webkitUserSelect   : 'none',
  webkitTouchCallout : 'none'
};

// :::::: MATRIX
// a 2d affine matrix { a, b, c, d, e, f } — the same six numbers as
// CSSMatrix / `matrix(a,b,c,d,e,f)`. transformable accumulates one of these and
// hands back both the raw matrix and its decomposition, so callers can drive
// either `element.style.transform = matrix(...)` or discrete x/y/scale/rotation.

const mIdentityParts = (x, y, scale, rotation) => {
  const rad = rotation * Math.PI / 180;
  const cos = Math.cos(rad) * scale;
  const sin = Math.sin(rad) * scale;
  return { a: cos, b: sin, c: -sin, d: cos, e: x, f: y };
};

// m · n (apply n first, then m)
const mMultiply = (m, n) => ({
  a: m.a * n.a + m.c * n.b,
  b: m.b * n.a + m.d * n.b,
  c: m.a * n.c + m.c * n.d,
  d: m.b * n.c + m.d * n.d,
  e: m.a * n.e + m.c * n.f + m.e,
  f: m.b * n.e + m.d * n.f + m.f
});

const mTranslate = (x, y) => ({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });

// similarity (uniform scale + rotation, no shear) about the origin
const mScaleRotate = (scale, rad) => {
  const cos = Math.cos(rad) * scale;
  const sin = Math.sin(rad) * scale;
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
};

// exact for a similarity matrix (what we only ever build here)
const mDecompose = m => ({
  x        : m.e,
  y        : m.f,
  scale    : Math.hypot(m.a, m.b),
  rotation : Math.atan2(m.b, m.a) * 180 / Math.PI
});

// :::::: RECOGNIZERS

// tap, double-tap and long-press on a single pointer. when onDoubleClick is set
// the single click is deferred by doubleWithin so the two can be told apart —
// without it, onClick fires immediately (no added latency). movement past
// tolerance, or a hold past threshold, cancels the click.
export function pressable ({ onClick, onDoubleClick, onLongClick, threshold = 500, tolerance = 8, doubleWithin = 300 } = {}) {
  let timer   = null;
  let single  = null;
  let id      = null;
  let moved   = false;
  let long    = false;
  let x       = 0;
  let y       = 0;
  let lastTap = 0;

  const clearLong = () => { clearTimeout(timer); timer = null; };
  const reset     = () => { clearLong(); id = null; moved = false; long = false; };

  const down = event => {
    if (!event.isPrimary || id !== null) return;
    id = event.pointerId; moved = false; long = false;
    x  = event.clientX; y = event.clientY;
    event.currentTarget.setPointerCapture?.(id);
    if (onLongClick) timer = setTimeout(() => { long = true; onLongClick(event); }, threshold);
  };

  const move = event => {
    if (event.pointerId !== id || moved) return;
    if (Math.hypot(event.clientX - x, event.clientY - y) > tolerance) { moved = true; clearLong(); }
  };

  const up = event => {
    if (event.pointerId !== id) return;
    const dead = moved || long;
    reset();
    if (dead) return;

    const now = event.timeStamp || Date.now();
    if (onDoubleClick && now - lastTap < doubleWithin) {
      clearTimeout(single); single = null;
      lastTap = 0;
      onDoubleClick(event);
      return;
    }
    lastTap = now;
    if (onDoubleClick) single = setTimeout(() => { single = null; onClick?.(event); }, doubleWithin);
    else onClick?.(event);
  };

  return {
    handlers : {
      pointerdown   : down,
      pointermove   : move,
      pointerup     : up,
      pointercancel : reset,
      contextmenu   : event => event.preventDefault()
    },
    style   : NO_SELECT,
    destroy : () => { clearTimeout(single); reset(); }
  };
}

// fires onHold(count) once on press, then repeatedly while held: after `delay`,
// every `speed` ms. the classic press-and-repeat button (e.g. a stepper).
export function holdable ({ onHold, delay = 500, speed = 100 } = {}) {
  let timer    = null;
  let interval = null;
  let id       = null;
  let count    = 0;

  const stop = () => { clearTimeout(timer); clearInterval(interval); timer = interval = id = null; };

  const down = event => {
    if (!event.isPrimary || id !== null) return;
    id = event.pointerId; count = 0;
    event.currentTarget.setPointerCapture?.(id);
    if (event.cancelable) event.preventDefault();
    onHold?.(count);
    timer = setTimeout(() => { interval = setInterval(() => onHold?.(++count), speed); }, delay);
  };

  const up = event => { if (event.pointerId === id) stop(); };

  return {
    handlers : {
      pointerdown   : down,
      pointerup     : up,
      pointercancel : stop,
      pointerleave  : up,
      contextmenu   : event => event.preventDefault()
    },
    style   : NO_SELECT,
    destroy : stop
  };
}

// directional flick. resolves to one of up/down/left/right past `threshold`,
// optionally only when the gesture was quick enough (`holdTime`). set
// preventScroll to lock the axis while swiping.
export function swipeable ({
  onSwipe, onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight,
  threshold     = 50,
  holdTime      = 0,
  preventScroll = false
} = {}) {
  let id = null;
  let x  = 0;
  let y  = 0;
  let t  = 0;

  const down = event => {
    if (!event.isPrimary || id !== null) return;
    id = event.pointerId; x = event.clientX; y = event.clientY; t = Date.now();
  };

  const move = event => {
    if (event.pointerId === id && preventScroll && event.cancelable) event.preventDefault();
  };

  const up = event => {
    if (event.pointerId !== id) return;
    id = null;

    const deltaX   = event.clientX - x;
    const deltaY   = event.clientY - y;
    const duration = Date.now() - t;
    if (holdTime > 0 && duration < holdTime) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (Math.max(absX, absY) < threshold) return;

    const direction = absX > absY
      ? deltaX > 0 ? 'right' : 'left'
      : deltaY > 0 ? 'down'  : 'up';

    const payload = { direction, deltaX, deltaY, duration, event };
    onSwipe?.(payload);
    ({ up: onSwipeUp, down: onSwipeDown, left: onSwipeLeft, right: onSwipeRight })[direction]?.(payload);
  };

  return {
    handlers : {
      pointerdown   : down,
      pointermove   : move,
      pointerup     : up,
      pointercancel : () => { id = null; },
      pointerleave  : up
    },
    touchAction : preventScroll ? 'none' : undefined,
    destroy     : () => { id = null; }
  };
}

// single-pointer drag. the gesture only starts once the pointer leaves the
// `tolerance` radius, then reports total delta (from start) and per-move step.
export function pannable ({ onPanStart, onPan, onPanEnd, tolerance = 8 } = {}) {
  let id     = null;
  let active = false;
  let x      = 0;
  let y      = 0;
  let lastX  = 0;
  let lastY  = 0;

  const payload = event => ({
    deltaX : event.clientX - x,
    deltaY : event.clientY - y,
    stepX  : event.clientX - lastX,
    stepY  : event.clientY - lastY,
    event
  });

  const down = event => {
    if (!event.isPrimary || id !== null) return;
    id = event.pointerId; active = false;
    x = lastX = event.clientX;
    y = lastY = event.clientY;
    event.currentTarget.setPointerCapture?.(id);
  };

  const move = event => {
    if (event.pointerId !== id) return;
    if (!active) {
      if (Math.hypot(event.clientX - x, event.clientY - y) < tolerance) return;
      active = true;
      onPanStart?.(payload(event));
    }
    if (event.cancelable) event.preventDefault();
    onPan?.(payload(event));
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const up = event => {
    if (event.pointerId !== id) return;
    if (active) onPanEnd?.(payload(event));
    id = null; active = false;
  };

  return {
    handlers : {
      pointerdown   : down,
      pointermove   : move,
      pointerup     : up,
      pointercancel : up
    },
    style       : NO_SELECT,
    touchAction : 'none',
    destroy     : () => { id = null; active = false; }
  };
}

// two-finger resize mapped to a single clamped scalar (a cell/element size).
// the finger pair's orientation picks the axis — side by side -> 'x', stacked ->
// 'y', diagonal -> 'both'; lock it with axis: 'x' | 'y' | 'both'. ctrl/cmd + wheel
// nudges the same value on the desktop.
export function adjustable ({
  onAdjust,
  value     = 48,
  min       = 48,
  max       = 256,
  steps     = null,
  axis      = 'auto',
  wheelStep = 16,
  wheel     = true
} = {}) {
  const points  = new Map();
  let   current = value;
  let   start   = null;

  const spread = () => {
    const [a, b] = [...points.values()];
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return { dx, dy, d: Math.hypot(dx, dy) };
  };

  const pick = ({ dx, dy }) =>
      axis !== 'auto' ? axis
    : dx > dy * 2      ? 'x'
    : dy > dx * 2      ? 'y'
    : 'both';

  const measure = s => start.axis === 'x' ? s.dx : start.axis === 'y' ? s.dy : s.d;

  const emit = (element, next, final, usedAxis) => {
    current = clamp(final ? snap(next, steps) : next, min, max);
    onAdjust?.(current, { axis: usedAxis, final, element });
  };

  const down = event => {
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.size !== 2) return;
    const s = spread();
    start = { axis: pick(s), base: 0, value: current };
    start.base = measure(s);   // measure() needs start.axis, so set it after
  };

  const move = event => {
    if (!points.has(event.pointerId)) return;
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.size !== 2 || !start || start.base <= 0) return;
    if (event.cancelable) event.preventDefault();
    emit(event.currentTarget, start.value * (measure(spread()) / start.base), false, start.axis);
  };

  const up = event => {
    const element = event.currentTarget;
    points.delete(event.pointerId);
    if (start && points.size < 2) { emit(element, current, true, start.axis); start = null; }
  };

  const onWheel = event => {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const step = typeof steps === 'number' ? steps : wheelStep;
    emit(event.currentTarget, current + (event.deltaY > 0 ? -step : step), true, 'both');
  };

  return {
    handlers : {
      pointerdown   : down,
      pointermove   : move,
      pointerup     : up,
      pointercancel : up,
      ...(wheel ? { wheel: onWheel } : {})
    },
    touchAction : 'pan-x pan-y',
    destroy     : () => { points.clear(); start = null; },
    set         : next => { current = clamp(next, min, max); }
  };
}

// normalized wheel. deltas are converted to pixels (see normalizeWheel); pass
// modifier: 'ctrl' | 'meta' | 'shift' | 'alt' to only react while it's held
// (e.g. the ctrl-wheel zoom convention). a plain building block reused by zoom.
export function wheelable ({ onWheel, modifier = null } = {}) {
  const key = modifier ? MODIFIER[modifier] : null;
  const handler = event => {
    if (key && !event[key]) return;
    event.preventDefault();
    const { deltaX, deltaY } = normalizeWheel(event);
    onWheel?.({ deltaX, deltaY, event });
  };
  return { handlers: { wheel: handler } };
}

// two-finger pinch reported as a scale factor relative to the gesture start
// (start = 1), with the focal point (the finger midpoint) it pivots around.
export function pinchable ({ onPinchStart, onPinch, onPinchEnd } = {}) {
  const points = new Map();
  let start = 0;   // finger distance when the pinch began (0 = idle)
  let last  = 1;

  const pair = () => [...points.values()];

  const fire = (fn, event) => {
    const [a, b] = pair();
    const scale  = distance(a, b) / start;
    fn?.({ scale, deltaScale: scale / last, focal: midpoint(a, b), event });
    last = scale;
  };

  const down = event => {
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.size !== 2) return;
    const [a, b] = pair();
    start = distance(a, b) || 1;
    last  = 1;
    onPinchStart?.({ scale: 1, deltaScale: 1, focal: midpoint(a, b), event });
  };

  const move = event => {
    if (!points.has(event.pointerId)) return;
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.size !== 2 || !start) return;
    if (event.cancelable) event.preventDefault();
    fire(onPinch, event);
  };

  const up = event => {
    if (start && points.size === 2) fire(onPinchEnd, event);
    points.delete(event.pointerId);
    if (points.size < 2) start = 0;
  };

  return {
    handlers    : { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up },
    touchAction : 'none',
    destroy     : () => { points.clear(); start = 0; }
  };
}

// two-finger rotation in degrees, accumulated over the gesture (so it passes
// through ±180 cleanly), with the focal point it turns around.
export function rotatable ({ onRotateStart, onRotate, onRotateEnd } = {}) {
  const points = new Map();
  let active = false;
  let prev   = 0;   // last raw finger-pair angle
  let total  = 0;   // accumulated rotation

  const pair = () => [...points.values()];

  const fire = (fn, event) => {
    const [a, b] = pair();
    const now    = angle(a, b);
    const step   = angleDelta(prev, now);
    total += step;
    prev   = now;
    fn?.({ rotation: total, deltaRotation: step, focal: midpoint(a, b), event });
  };

  const down = event => {
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.size !== 2) return;
    const [a, b] = pair();
    active = true;
    total  = 0;
    prev   = angle(a, b);
    onRotateStart?.({ rotation: 0, deltaRotation: 0, focal: midpoint(a, b), event });
  };

  const move = event => {
    if (!points.has(event.pointerId)) return;
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (points.size !== 2 || !active) return;
    if (event.cancelable) event.preventDefault();
    fire(onRotate, event);
  };

  const up = event => {
    if (active && points.size === 2) fire(onRotateEnd, event);
    points.delete(event.pointerId);
    if (points.size < 2) active = false;
  };

  return {
    handlers    : { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up },
    touchAction : 'none',
    destroy     : () => { points.clear(); active = false; }
  };
}

// the flagship: free move + scale + rotate of an object, one or two pointers,
// plus wheel zoom. it accumulates a 2d matrix by composing the frame-to-frame
// similarity transform between the pointers, so scaling and rotation happen
// around the finger (or cursor) focal point. every callback gets the decomposed
// { x, y, scale, rotation } and the raw `matrix` — apply it with
// `transform: matrix(...)` on an element whose transform-origin is 0 0.
export function transformable ({
  onTransformStart, onTransform, onTransformEnd,
  x = 0, y = 0, scale = 1, rotation = 0,
  minScale = 0.05, maxScale = 40,
  pan = true, zoom = true, rotate = true,
  wheel = true, wheelIntensity = 0.0015, wheelModifier = null
} = {}) {
  let matrix = mIdentityParts(x, y, scale, rotation);
  const points = new Map();
  let prev = null;   // previous-frame point snapshot
  let live = false;

  const snapshot = () => [...points.values()].map(p => ({ x: p.x, y: p.y }));

  // compose a screen-space similarity onto the accumulated matrix, clamping the
  // resulting scale about the focal so bounds hold without breaking the pivot.
  const apply = step => {
    let factor = zoom ? step.scale : 1;
    const current = Math.hypot(matrix.a, matrix.b);
    const next    = current * factor;
    if (next < minScale) factor = minScale / current;
    if (next > maxScale) factor = maxScale / current;

    const rad = rotate ? step.rotation : 0;
    const s   = mMultiply(mTranslate(step.to.x, step.to.y), mMultiply(mScaleRotate(factor, rad), mTranslate(-step.from.x, -step.from.y)));
    matrix    = mMultiply(s, matrix);
  };

  const emit = (fn, event, focal) => {
    const t = mDecompose(matrix);
    fn?.({ ...t, matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f], focal, event });
  };

  const down = event => {
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    prev = snapshot();
    if (points.size === 1) { live = true; emit(onTransformStart, event, prev[0]); }
  };

  const move = event => {
    if (!points.has(event.pointerId) || !live) return;
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const curr = snapshot();
    if (curr.length !== prev.length) { prev = curr; return; }
    if (event.cancelable) event.preventDefault();

    let focal;
    if (curr.length === 1) {
      // single pointer only translates (when panning is on)
      apply({ from: pan ? prev[0] : curr[0], to: curr[0], scale: 1, rotation: 0 });
      focal = curr[0];
    } else {
      // the frame-to-frame similarity that maps the previous finger pair onto the
      // current one: T(to) · scaleRotate · T(-from). apply() gates zoom/rotate and
      // clamps the scale about the focal; from == to (no pan) keeps it in place.
      const pFrom = midpoint(prev[0], prev[1]);
      const pTo   = midpoint(curr[0], curr[1]);
      const scale = distance(curr[0], curr[1]) / (distance(prev[0], prev[1]) || 1);
      const rad   = angleDelta(angle(prev[0], prev[1]), angle(curr[0], curr[1])) * Math.PI / 180;
      apply({ from: pan ? pFrom : pTo, to: pTo, scale, rotation: rad });
      focal = pTo;
    }
    prev = curr;
    emit(onTransform, event, focal);
  };

  const up = event => {
    if (!points.has(event.pointerId)) return;
    points.delete(event.pointerId);
    prev = snapshot();
    if (points.size === 0) { live = false; emit(onTransformEnd, event, { x: event.clientX, y: event.clientY }); }
  };

  const onWheel = event => {
    if (!zoom || !wheel) return;
    if (wheelModifier && !event[MODIFIER[wheelModifier]]) return;
    event.preventDefault();
    const { deltaY } = normalizeWheel(event);
    const focal = { x: event.clientX, y: event.clientY };
    apply({ from: focal, to: focal, scale: Math.exp(-deltaY * wheelIntensity), rotation: 0 });
    emit(onTransform, event, focal);
  };

  return {
    handlers : {
      pointerdown   : down,
      pointermove   : move,
      pointerup     : up,
      pointercancel : up,
      ...(wheel ? { wheel: onWheel } : {})
    },
    touchAction : 'none',
    destroy     : () => { points.clear(); live = false; },
    set         : next => { matrix = mIdentityParts(next.x ?? 0, next.y ?? 0, next.scale ?? 1, next.rotation ?? 0); },
    get         : () => mDecompose(matrix)
  };
}

// :::::: COMPOSE

const FACTORIES = [
  ['pressable',     pressable,     o => o.onClick || o.onDoubleClick || o.onLongClick],
  ['holdable',      holdable,      o => o.onHold],
  ['swipeable',     swipeable,     o => o.onSwipe || o.onSwipeUp || o.onSwipeDown || o.onSwipeLeft || o.onSwipeRight],
  ['pannable',      pannable,      o => o.onPan || o.onPanStart || o.onPanEnd],
  ['pinchable',     pinchable,     o => o.onPinch || o.onPinchStart || o.onPinchEnd],
  ['rotatable',     rotatable,     o => o.onRotate || o.onRotateStart || o.onRotateEnd],
  ['wheelable',     wheelable,     o => o.onWheel],
  ['adjustable',    adjustable,    o => o.onAdjust],
  ['transformable', transformable, o => o.onTransform || o.onTransformStart || o.onTransformEnd]
];

// most-restrictive wins when several recognizers want different touch-actions,
// so composing e.g. a pan (needs 'none') with an adjust ('pan-x pan-y') doesn't
// let the looser one re-enable native scrolling under the drag.
const TOUCH_RANK = { none: 3, 'pan-x': 2, 'pan-y': 2, 'pan-x pan-y': 1, manipulation: 1 };
const stricter   = (a, b) => (TOUCH_RANK[b] ?? 0) > (TOUCH_RANK[a] ?? 0) ? b : a;

// gestures(element, options) — binds every recognizer whose callbacks are present.
// shared option names can be scoped per recognizer:
//   gestures(el, { onClick, onSwipe, pressable: { threshold: 700 } })
export function gestures (element, options = {}) {
  const parts = FACTORIES
    .filter(([, , active]) => active(options))
    .map(([name, factory]) => factory({ ...options, ...options[name] }));

  const groups = {};
  const bound  = {};
  let   touch  = null;

  for (const part of parts) {
    if (part.style) Object.assign(element.style, part.style);
    if (part.touchAction) touch = touch === null ? part.touchAction : stricter(touch, part.touchAction);
    for (const type in part.handlers) (groups[type] ||= []).push(part.handlers[type]);
  }
  if (touch) element.style.touchAction = touch;

  for (const type in groups) {
    bound[type] = event => { for (const handler of groups[type]) handler(event); };
    element.addEventListener(type, bound[type], { passive: false });
  }

  return {
    parts,
    destroy () {
      for (const type in bound) element.removeEventListener(type, bound[type]);
      for (const part of parts) part.destroy?.();
    }
  };
}

export { angle, clamp, distance, midpoint, snap };
