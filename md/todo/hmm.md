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
@aufbau/commands
@aufbau/elements
@aufbau/gestures
@aufbau/gui
@aufbau/hotkeys

# @bunker
@bunker/cache
@bunker/core
@bunker/db
@bunker/opfs
@bunker/policy
@bunker/storage
@bunker/utils

# @domina
@domina/element
@domina/observer
@domina/prototype

# @gestalt
@gestalt/filters
@gestalt/patterns
@gestalt/webfonts

# @htx
@htx/htx
@htx/syntax
@htx/vdom

# @rat
@rat/compiler
@rat/runtime
@rat/std
@rat/syntax
@rat/types

# ???
bundler
devtools
logger
import
is
parsers
signals
store
str
stylescript
url
```
