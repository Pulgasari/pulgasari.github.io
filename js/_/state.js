// state.js

const
isBool   = spec => null,
isList   = spec => null,
isMap    = spec => null,
isSet    = spec => null,
isString = spec => null,
isToggle = spec => null;

class State {
  #signal = null;

  #notify = () => {};

  //get value () { return this._sig.value; }
  
  clear = () => {};
  reset = () => {};
}

class BoolState extends State {
  set    = (value) => this._notify(Boolean(val));
  toggle = (force) => {};
}

class ListState extends State {
  
  push = (item) => {};

  // overrides
  set  = (value) => this._notify(Boolean(val));
}



import { signal } from '@preact/signals';

// Base Primitive Class handling Signal wrapping, pathing, and bunker sync
class PathBaseState {
  constructor(store, path, initialValue, persist = false, serialize = (v) => v, deserialize = (v) => v) {
    this._store = store;
    this.path = path;
    this.persist = persist;
    this.serialize = serialize;
    this.deserialize = deserialize;
    this._sig = signal(initialValue);

    if (this.persist && this._store?.bunker) {
      this._hydrate();
    }
  }

  get value() {
    return this._sig.value;
  }

  // Preact DOM-Bypass handle
  get $node() {
    return this._sig;
  }

  _notify(newValue) {
    const oldValue = this._sig.value;
    this._sig.value = newValue;

    // Trigger path events & write serialized payload to bunker
    this._store?._notifyChange(this.path, newValue, oldValue, this.serialize(newValue));
  }

  async _hydrate() {
    const cached = await this._store.bunker.get(this.path);
    if (cached !== undefined && cached !== null) {
      this._sig.value = this.deserialize(cached);
    }
  }
}

// 1. Boolean Primitive
export class PathBooleanState extends PathBaseState {
  constructor(store, path, initial = false, persist = false) {
    super(store, path, initial, persist);
  }

  toggle = () => this._notify(!this._sig.value);
  on = () => this._notify(true);
  off = () => this._notify(false);
  set = (val) => this._notify(Boolean(val));
}

// 2. List / Array Primitive
export class PathListState extends PathBaseState {
  constructor(store, path, initial = [], persist = false) {
    super(store, path, Array.isArray(initial) ? initial : [], persist);
  }

  push = (...items) => this._notify([...this._sig.value, ...items]);
  
  remove = (itemOrPredicate) => {
    const next = typeof itemOrPredicate === 'function'
      ? this._sig.value.filter((item, index) => !itemOrPredicate(item, index))
      : this._sig.value.filter((item) => item !== itemOrPredicate);
    this._notify(next);
  };

  clear = () => this._notify([]);
  set = (newArray) => this._notify(Array.isArray(newArray) ? newArray : []);
}

// 3. Key/Value Object Primitive
export class PathObjectState extends PathBaseState {
  constructor(store, path, initial = {}, persist = false) {
    super(store, path, initial && typeof initial === 'object' ? { ...initial } : {}, persist);
  }

  setKey = (key, value) => {
    this._notify({ ...this._sig.value, [key]: value });
  };

  deleteKey = (key) => {
    const { [key]: _, ...rest } = this._sig.value;
    this._notify(rest);
  };

  merge = (partialObj) => {
    this._notify({ ...this._sig.value, ...partialObj });
  };

  clear = () => this._notify({});
  set = (newObj) => this._notify({ ...newObj });
}

// 4. Map Primitive
export class PathMapState extends PathBaseState {
  constructor(store, path, initial = new Map(), persist = false) {
    const mapInstance = initial instanceof Map ? initial : new Map(initial);
    super(
      store,
      path,
      mapInstance,
      persist,
      (map) => Array.from(map.entries()), // Serialize to [[key, val], ...]
      (entries) => new Map(entries)      // Deserialize back to Map
    );
  }

  set = (key, value) => {
    const next = new Map(this._sig.value);
    next.set(key, value);
    this._notify(next);
  };

  delete = (key) => {
    const next = new Map(this._sig.value);
    if (next.delete(key)) {
      this._notify(next);
    }
  };

  clear = () => this._notify(new Map());
  has = (key) => this._sig.value.has(key);
  get = (key) => this._sig.value.get(key);
}

// 5. Set Primitive
export class PathSetState extends PathBaseState {
  constructor(store, path, initial = new Set(), persist = false) {
    const setInstance = initial instanceof Set ? initial : new Set(initial);
    super(
      store,
      path,
      setInstance,
      persist,
      (set) => Array.from(set), // Serialize to Array
      (arr) => new Set(arr)    // Deserialize back to Set
    );
  }

  add = (item) => {
    const next = new Set(this._sig.value);
    next.add(item);
    this._notify(next);
  };

  delete = (item) => {
    const next = new Set(this._sig.value);
    if (next.delete(item)) {
      this._notify(next);
    }
  };

  toggle = (item) => {
    const next = new Set(this._sig.value);
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    this._notify(next);
  };

  clear = () => this._notify(new Set());
  has = (item) => this._sig.value.has(item);
}
