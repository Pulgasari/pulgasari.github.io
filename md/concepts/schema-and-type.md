# schema and type :: two ways to build one name

A data type with a schema has two jobs under one name:

- **the schema**: a description that checks and coerces a value (`validate`, `parse`, `optional()`)
- **the data type**: a class whose instances hold data (`new Dict(…)`, methods, `instanceof`)

```js
const Commands = Dict(Str.to(KebabCase), { exec: Fn, '?title': Str });   // the schema
const commands = new Dict(Commands);                                       // a value of the type
```

The question is how the two find each other. There are two ways to build that.

---

## A: the schema is a value that can create

The call returns a schema object. It remembers the data type it was made by and can create an instance of it.

```js
const Commands = $Dict(Str.to(KebabCase), { exec: Fn, '?title': Str });
const commands = Commands.create({ save: { exec: save } });   // a $Dict, checked by Commands
```

### how

One name serves both ways through a proxy around the class: `new` reaches the class, a call reaches the schema factory. The factory puts a `make` onto the schema it returns:

```js
const byConstructor = (Type, schema, value) => new Type(schema, value);

function typed (Class, toSchema, make = byConstructor) {
  const Type = new Proxy(Class, {
    apply: (target, self, args) => toSchema(...args).derive({ make: (schema, value) => make(Type, schema, value) }),
  });
  return Type;
}

class Schema {
  create (value) {
    if (!this.make) throw new TypeError(`${this.kind} is no data type`);
    return this.make(this, value);
  }
}
```

- `make` gets the schema it is called on, not the one the call made. So a derived schema (`Commands.optional()`) still creates with its own checks.
- A reactive variant is the same construction around the reactive class: `typed(reactive(Dict), dictOf)`. Whether a value is reactive is decided by the schema (`$Dict(…)` or `Dict(…)`), not at the place it is created.
- Types whose constructor is not `(schema, value)` pass their own `make`. For example, a List holds no schema of its own, so it gets its items checked once: `(Type, schema, items) => new Type(schema.parse(items))`.

### what it gives

- **One kind of schema.** `Str`, `Num` and the cases are schemas, and `Dict(…)` and `List(…)` are schemas too. All of them nest (`Record({ commands: Commands })`), derive (`.optional()`, `.to()`), get stored and passed around in the same way.
- **Only types create.** `Str.create()` throws: a string is plain js, there is nothing to make.
- **Cheap.** One field on the schema, one method, one proxy per data type. No class per call.

### what it does not give

- **No `new Commands`, no `instanceof Commands`.** `Commands.is(value)` checks the content. `value.schema === Commands` checks the origin.
- **No `class MyCommands extends Commands`.** To extend behaviour, extend the data type (`class extends Dict`) and pass it to `typed`.

---

## B: the schema is a class

The call returns a subclass of the data type. It carries the schema in static methods.

```js
const Commands = Dict(Str.to(KebabCase), { exec: Fn, '?title': Str });
const commands = new Commands({ save: { exec: save } });

commands instanceof Commands;   // true
Commands.parse(input);          // the schema, as statics
class AppCommands extends Commands { run (name) { … } }
```

Immutable.js `Record`, Pydantic's `BaseModel` and Effect's `Schema.Class` work this way: the model is the class.

### how

```js
function dictOf (key, value) {
  const schema = makeDictSchema(key, value);
  return class extends DictType {
    static schema   = schema;
    static validate = (input, path) => schema.validate(input, path);
    static parse    = input => schema.parse(input);
    static optional = () => …;   // every derivation has to return a class again
    constructor (entries) { super(schema, entries); }
  };
}
```

### what it gives

- **`new`, `instanceof`, `extends`**, as with any class. The most natural form when a value is an object with behaviour.
- **One line less** at the use site, and no `create`.

### what it costs

- **Two kinds of schema.** `Str`, `Num`, `Bool`, `Fn`, `Union` and the cases have no data type. They stay objects, while `Dict(…)` and `List(…)` become classes. Code that takes "a schema" has to know both forms.
- **Every derivation has to stay a class.** `.optional()`, `.nullable()`, `.default()`, `.check()` and `.to()` each make a new class and copy the statics. Otherwise a derived schema falls back to being a plain object.
- **A class per call.** Every `Dict(K, V)`, including one used only as a field inside a `Record`, creates a class that is never instantiated.
- **The reactive variant doubles it.** `$Dict(K, V)` needs a second class per schema, built on the reactive base.
- **Standard schema interop is still possible** (`'~standard'` as a static getter), but it lives on a function object, which some tools check for.

---

## side by side

| | A: schema creates | B: schema is a class |
|---|---|---|
| make a value | `Commands.create(x)` | `new Commands(x)` |
| check a value | `Commands.is(x)` | `Commands.is(x)` (static) |
| where it came from | `x.schema === Commands` | `x instanceof Commands` |
| extend behaviour | extend the data type | `class extends Commands` |
| schemas without a type | the same kind of object | a different kind (objects) |
| derive (`.optional()`) | a new object | a new class, statics copied |
| per call | one object | one class (two with `$`) |
| reactive | `$Dict(…)` decides | a second class |

---

## rule of thumb

- **Most schemas describe plain values** (strings, numbers, fields). The schema is a value and the data type is an exception: **A**.
- **Every schema is a model with behaviour** (an ORM, domain objects) and there are no plain-value schemas: **B**.

rat's `@rat/types` takes A. Plain-value schemas (`Str`, `Num`, the cases, `Union`) are the majority, they nest into the data types, and everything stays one kind of object.
