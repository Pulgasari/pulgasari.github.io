
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

Scheint.im Prinzip nur eine andere Form zu sowas:

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

## `match` von ArkType

```js
import { match } from 'arktype';

const describe = match
  .case({ type: "'user'", name: 'string' }, user => `user ${user.name}`)
  .case('string', text => text)
  .default(() => 'other');

describe({ type: 'user', name: 'ada' });   // 'user ada'
describe(4);                               // 'other'

const label = match({ string: s => `str ${s}`, number: n => `num ${n}`, default: 'assert' });
```

Scheint nur ne andere Form für mein Konstrukt zu sein:
  
```js
import { isString } from '@pulgasari/is';
import { shift } from '@pulgasari/shift';

const isUser = ...;

const describe = shift ({
  isUser   : (user) => `user ${user.bame)`,
  isString : (x)    => x,
  fallback : ()     => 'other',
});
```

##

neu konzipiert könnte daraus werden:

hier sind `pred` und `case` dasselbe, ich weiss bloß nicht, welche bezeichnung besser wäre.

```js
import { pred, switch } from `@rat/runtime`;

pred.create('user', ...);

```

bzw. innerhalb einer `.rat`-file:

```js
<script>
  pred user = ...;
</script>

@fragment user:
<div>
  <span class='username'>this.username</span>
  <span class='email'>this.email</span>
</div>


@switch (sth)
  @case user: @fragment
  @case
```

