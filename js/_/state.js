// state.js
/*
const config = new Store ({
  font  : { value: 'Manrope', values: fontList,  on: applyFont    },
  theme : { value: 'zombie',  values: themeList, on: 'data-theme' },
};

const config = new Store ({
  font  : leaf.string({ value: 'Manrope', values: fontList,  on: applyFont    }),
  theme : leaf.string({ value: 'zombie',  values: themeList, on: 'data-theme' }),
};
*/

const
isBool   = spec => spec !== undefined && (instanceof Boolean),
isList   = spec => spec !== undefined,
isMap    = spec => spec !== undefined && (instanceof Map),
isPair   = spec => spec !== undefined,
isSet    = spec => spec !== undefined && (instanceof Set),
isString = spec => spec !== undefined,
isToggle = spec => spec !== undefined;

const leaf = {
  bool   : (defs) => new   BoolState (def),
  list   : (defs) => new   ListState (def),
  map    : (defs) => new    MapState (def),
  number : (defs) => new NumberState (def),
  pair   : (defs) => new   PairState (def),
  scalar : (defs) => new ScalarState (def),
  set    : (defs) => new    SetState (def),
  string : (defs) => new StringState (def),
};

class State {
  #value = null;
  #subs  = new Set;
  #notify = () => {};

  //get value () { return this._sig.value; }
  
  clear = () => {};
  reset = () => {};
}

class BoolState extends State {
  #value = new Boolean;
  toggle = (force) => {};
  set    = (value) => this.#state = value;
}

class MapState extends State {
  #value = new Map;
  has    = (key) => this.#state.has(key);
  get    = (key) => this.#state.get(key);
  set    = (key) => this.#state.set(key);
}

class ListState extends State {
  // methods
  push = (item) => {};
  // methods: overrides
  set  = (value) => this._notify(Boolean(val));
}


