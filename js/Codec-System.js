
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
