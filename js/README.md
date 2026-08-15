# @pulgasari

```txt
@pulgasari/is
@pulgasari/logger
@pulgasari/str
@pulgasari/url
```

## @pulgasari/is

### predicates

every predicate is total: never throws on null/undefined, never touches a global at module level. dom checks are duck-typed, so the module loads and answers false in node instead of binding to a missing constructor at import.


## @pulgasari/logger

minimal console wrapper: prefix, named colors, groups, tables, optional debug gating. styling goes through `%c` in browsers and ansi truecolor in node.

writers are getters returning a *bound* native console method, 
so devtools report the real call site instead of this file. 
price: no chaining, every call returns undefined. 
a chainable variant sits at the bottom of this file.

---

- `shapeshift` für casting stuff?
