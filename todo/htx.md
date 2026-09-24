# htx :: todo

- [x] `<>...</>` renders `Fragment`

## attributes
- [x] `class:active=${...}` matcht on `true`
- [ ] `class:!inactive=${...}` matcht on `false`
- [ ] `class:active!inactive=${...}` matcht on `true` oder `false`
- [ ] `--css-var='red'`
- [ ] `--css-var:red=${...}`
- [ ] `--css-var:red!blue=${...}`

## umzug

- [ ] wir ziehen `js-packages/htx` in ein eigenes repo `htx` um
- [ ] dort teilen wir es sauber in packages auf:
  - [ ] `@htx/htx` = `htx/packages/core`
  - [ ] `@htx/js` = `htx/packages/js`
  - [ ] `@htx/preact` = `htx/packages/preact`
