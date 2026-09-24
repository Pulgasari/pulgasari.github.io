# todo @ aufbau

---

## `@aufbau/components`

### `<aufbau-fontpicker>`

### `<aufbau-gui>`

### `<aufbau-keyboard>`

### `<aufbau-notifications>`

---

## `@aufbau/elements`

dropdown
flyout
popover
sidescroll

badge / chip
card
comment
empty
form

timeline

indicate-error
indicate-loading
indicate-success


menu-actions
menu-bento
pick-date
pick-color

aufbau-paginate
aufbau-stepper
aufbau-tabs

### `<aufbau-date>`

### `<aufbau-modal>`

### `<aufbau-value>`

---

## aufbau/elements/core

### bessere props und logging

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

### `<aufbau-input>` enhancements

`<aufbau-input>` sollte optional so icons/buttons mitbringen für: clear, copy, paste

### `<aufbau-progress>`

- könnte als look vllt noch `circle` bekommen

## new elements

- [ ] `aufbau-breadcrumbs` (oder `aufbau-crumbs`?)
- [ ] `aufbau-menu`
- [ ] `aufbau-menu-item`
- [ ] `aufbau-modal` + interface

und bei denen weiss ich nicht genau, ob die eigene elements oder lieber type/look sein sollten:

- [ ] `aufbau-contextmenu` (oder teil von `aufbau-menu`) ?

