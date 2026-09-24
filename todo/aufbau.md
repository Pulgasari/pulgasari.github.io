# todo @ aufbau

---

## `@aufbau/components`

### `<aufbau-fontpicker>`

### `<aufbau-gui>`

### `<aufbau-keyboard>`

### `<aufbau-notifications>`

---

## `@aufbau/elements`

### `<aufbau-date>`

### `<aufbau-modal>`

### `<aufbau-value>`

---

## aufbau/elements/core

### 1. bessere props und logging

```js
#isMounted = false;
#tag       = this.localName;
#logger    = new Logger({ prefix: this.#tag });

#error  = (...args) => this.#logger.error (...args);
#info   = (...args) => this.#logger.info  (...args);
#log    = (...args) => this.#logger.log   (...args);
#warn   = (...args) => this.#logger.warn  (...args);
```

wobei vermutlich für jedes element ne neue instanz zu machen quatsch ist. aber vom grundprinzip dachte ich mir, dass man so besseres debugging zur verfügung stellen könnte.

### input enhancements

`<aufbau-input>` sollte optional so icons/buttons mitbringen für: clear, copy, paste
