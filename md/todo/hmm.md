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
