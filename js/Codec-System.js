// scratchfile :: dataflow.js

const isFn     = (value) => value instanceof Fn  || typeof value === 'function';
const isString = (value) => value instanceof Str || typeof input === 'string';

// 1. Built-in Codecs
const Codecs = {
  // Safe JSON parser codec
  json: () => ({
    decode: (input) => {
      if (isString(input)) {
        try         { return JSON.parse(input); }
        catch (err) { throw new Error(`Failed to parse JSON string: ${err.message}`); }
      }
      return input;
    }
  }),

  // Custom function wrapper as codec
  fn: (transform) => ({ decode: transform })
};

// 2. Value Wrapper Class
class Value {
  #raw;

  constructor (raw) { this.#raw = raw; }
  static of   (val) { return new Value (val); }

  // accepts either a Codec object or a direct decoder function
  as (codec) {
    if (isFn(code)) return codec(this.#raw);
    return codec.decode(this.#raw);
  }
}



// DF is namespace of my library
import DF from 'dataflow.js';

DF.Codecs.JSON = new DF.Codec (...);

async function viaNative (http, url, { accept, as }) {
  const response = await http.request({ 
    headers: accept ? { accept } : {}, 
    method: 'GET', 
    responseType: as, 
    url 
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`);
  }

  // form 1: pply JSON Codec conditionally
  if (as === 'json') return DF.Value.of(response.data).as(DF.Codecs.JSON);
  return response.data;

  // form 2: wie konstruiert man sowas?
  return DF.Value.of(response.data).as({
    'json' : (raw) => DF.Codecs.JSON (sth),
    _      : (raw) => raw,
  });

  // Form 3: oder vllt sogar so?
  return DF.Value.of(response.data).as({
    'json' : DF.Codecs.JSON,
    _      : DF.Codecs.None,
  });

  // ich denk, denkt man daszu ende geht das noch simpler?
  // an ende will ich nen klar lesbare form haben
  // wo man am ende eigtl nur n inputvalue wrappt mit 1 odrr mehrere codecs
  // und gut is. dass der codec den inputvalue verarbeiten muss ich haltsicherstellen
  // aber is eigtl gar keine frage an dieser stelle.
}



// 1. Standard JSON parsing
const data1 = Value.of('{"foo":"bar"}').as(Codecs.json()); 

// 2. Inline transformation
const data2 = Value.of('  hello world  ').as(str => str.trim().toUpperCase());

// 3. Custom codec
const UserCodec = {
  decode: (input) => {
    const parsed = Value.of(input).as(Codecs.json());
    if (!parsed || typeof parsed.name !== 'string') {
      throw new Error('Invalid User Schema');
    }
    return parsed;
  }
};

const user = Value.of('{"name": "Alice"}').as(UserCodec);





// Extended Value implementation
class Value {
  #raw;

  constructor(raw) {
    this.#raw = raw;
  }

  static of(val) {
    return new Value(val);
  }

  // Helper to extract function/decode from codec or plain fn
  #resolve(codec) {
    if (!codec) return (x) => x; // Pass-through for falsy codecs
    if (typeof codec === 'function') return codec;
    if (typeof codec.decode === 'function') return codec.decode.bind(codec);
    return (x) => x;
  }

  // Variadic pipeline: accepts 1 or more codecs, skipping falsy values
  as(...codecs) {
    return codecs.reduce((acc, codec) => this.#resolve(codec)(acc), this.#raw);
  }

  // Key-based dispatch (Form 2 & 3)
  match(key, map) {
    const codec = map[key] ?? map._ ?? map.default;
    return this.as(codec);
  }
}

/*
## Variante A: Key-Based Dispatch (.match())
​Wenn du wie in Form 2 & 3 eine Lookup-Table übergeben willst,
braucht die Methode den Selektor-Key (hier as). 
Mit .match(key, map) sieht das extrem übersichtlich aus:
*/

    // Form 3 polished with .match()
async function viaNative(http, url, { accept, as }) {
  const response = await http.request({ 
    headers: accept ? { accept } : {}, 
    method: 'GET', 
    responseType: as, 
    url 
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`);
  }

  return DF.Value.of(response.data).match(as, {
    json: DF.Codecs.JSON,
    _   : DF.Codecs.Identity // Pass-through fallback
  });
}

/*
## Variante B: Das simpelste Pipeline-Design (Variadic .as())
​Wenn .as() mehrere Codecs als Argumente akzeptiert
und falsy-Werte (wie false, null, undefined) einfach ignoriert,
brauchst du nicht mal eine spezielle Map-Syntax.
​Du wrappst einfach deinen Wert und wirfst 1 bis n Codecs hinein:
*/

// Ultra-simple pipeline style
async function viaNative(http, url, { accept, as }) {
  const response = await http.request({ 
    headers: accept ? { accept } : {}, 
    method: 'GET', 
    responseType: as, 
    url 
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`);
  }

  // Apply JSON codec only if condition is true, otherwise pass through
  return DF.Value.of(response.data).as(
    as === 'json' && DF.Codecs.JSON
  );
}

// usage:
// Multi-codec chaining
return DF.Value.of(response.data).as(
  as === 'json' && DF.Codecs.JSON,
  DF.Codecs.TrimStrings,
  DF.Codecs.Sanitize
);


// :::::::::::: dataflow.js

const DF = {};

// 1. Codec Base Class
class Codec {
  constructor(decoder) {
    // Fallback to identity function if no decoder function provided
    this.decode = typeof decoder === 'function' ? decoder : (input) => input;
  }

  static of(fn) {
    return new Codec(fn);
  }
}


// 2. Value Class with Choice Dispatch
class Value {
  #raw;

  constructor (raw) {
    this.#raw = raw;
  }

  static of (val) {
    return new Value(val);#
  }

  as (keyOrCodec, map) {
    // Choice Branch: .as('json', { json: DF.Codecs.JSON, _: DF.Codecs.None })
    if (map && typeof map === 'object') {
      const selected = map[keyOrCodec] ?? map._ ?? map.default;
      return this.as(selected);
    }

    // Direct Resolution
    if (keyOrCodec instanceof Codec) {
      return keyOrCodec.decode(this.#raw);
    }
    if (typeof keyOrCodec === 'function') {
      return keyOrCodec(this.#raw);
    }

    return this.#raw;
  }
}

// Built-in / Static Codecs
Codec.None = new Codec ((raw) => raw);

Codec.JSON = new Codec((input) => {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch (err) {
      throw new Error(`Failed to parse JSON string: ${err.message});
    }
  }
  return input;
});

export         { Codec, Value };
export default { Codec, Value };

// usage
async function viaNative(http, url, { accept, as }) {
  const response = await http.request({ 
    headers: accept ? { accept } : {}, 
    method: 'GET', 
    responseType: as, 
    url 
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`);
  }

  // Pure choice lookup
  return DF.Value.of(response.data).as(as, {
    json : DF.Codecs.JSON,
    _    : DF.Codecs.None
  });
}

