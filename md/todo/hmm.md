#

- `htx` wird teil von `domina` als `@domina/htx`
- `@aufbau/element` wird `@domina/htx-element` oder `@domina/element`, das intern `htx` als tagged templste fn nutzt
- `htx` ist im kern "nur" eine syntax + renderer (?) (`@rat` benutzt sie pure und extended)
- `@aufbau/elements` nutzt`@domina/htx-element` bzw. `@domina/element` als basis

außerdem:
- `@htx/elements` wird überflüssig und `htx-part` wird umbenannt (`<app-part>` ?) und wird teil von `@aufbau/elements` oder eventuell `@rat/elements`
- wie ebenfalls evtl die `app-` elements von `@aufbau/elements` zu `@rat/elements` werden könnten

außerdem:
- `@htx/compiler` geht im aktuellen ansatz wohl eher in `@rat` mit auf


---

```md
# @aufbau
@aufbau/elements
@aufbau/gestures
@aufbau/gui

# @bunker
@bunker/cache
@bunker/core
@bunker/db
@bunker/opfs
@bunker/policy
@bunker/storage
@bunker/utils

# @domina
@domina/chain
@domina/devtools
@domina/element
@domina/observer
@domina/prototypes
@domina/render

# @gestalt
@gestalt/engine
@gestalt/filters
@gestalt/patterns
@gestalt/webfonts

# @htx
@htx/htx
@htx/js
@htx/syntax
@htx/vdom

# @rat
@rat/app
@rat/commands
@rat/compiler
@rat/hotkeys
@rat/import
@rat/router
@rat/runtime
@rat/signals
@rat/std
@rat/syntax
@rat/types

# ???
bundler
logger
is
parsers
store
str
stylescript
url
workers (brigade)
```





