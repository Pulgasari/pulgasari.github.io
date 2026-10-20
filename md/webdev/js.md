# JavaScript 

## Functions

### what are functions?

```js
const a = compute (9, 5);

function compute (x, y) {
  return x+ y;
}

console.log(a);
```

### function declaration
...

### function input & output: parameters & return
...

### function invocation
...

### hoisting

**functions** (and **variables** defined with `var`) are put into the memory during the compilation phase. this way the functions can be executed from anywhere, even in places before the actual definition.

### function expression
this is not hoisted

#### anonymous function expression
```js
const a = compute (4, 5);

const compute = function (x, y) {
  return x + y;
}

console.log(a);
```

#### named function expression
useful to reference it inside itself.
```js
const a = compute (4, 5);

const compute = function calculate (x, y) {
  return x + y;
}

console.log(a);
```
