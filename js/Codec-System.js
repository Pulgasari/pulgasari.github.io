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
