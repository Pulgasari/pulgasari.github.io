
aus valibot

```js
import * as v from 'valibot';

const User = v.object({
  age   : v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  email : v.pipe(v.string(), v.email()),
  name  : v.pipe(v.string(), v.nonEmpty('name is required')),
  role  : v.optional(v.picklist(['admin', 'user']), 'user'),
});

// in typescript: type User = v.InferOutput<typeof User>
```

dumme form. is quasi:

```js
const User = v.object({
  age   : v.optional(pipe(Number, isInteger, hasValueMin(0))),
  email : pipe(String, isEmail),
  name  : pipe(String, isNonEmpty('name is required')),
  role  : v.optional(Choice(['admin', 'user']), 'user'),
});
```

## valibot, example 2

```js
const Port = v.pipe(
  v.string(),
  v.trim(),
  v.transform(Number),
  v.number(),
  v.integer(),
  v.maxValue(65535),
);
```
