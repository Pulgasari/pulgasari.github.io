# htx :: todo

- [x] `<>...</>` renders `Fragment`

## attributes
- [x] `class:active=${...}` matcht on `true`
- [ ] `class:!inactive=${...}` matcht on `false`
- [ ] `class:active!inactive=${...}` matcht on `true` oder `false`
- [ ] `--css-var='red'`
- [ ] `--css-var:red=${...}`
- [ ] `--css-var:red!blue=${...}`

## syntax ideas

### span-shorthand

```html
<div>[bla] bla [bla]</div>

<!-- compiles to: -->
<div>
  <span>bla</span>
  bla
  <span>bla</span>
</div>
```

---

# htxx ::

html```
<script>
  const aaa: xxx = true;
  bbb: yyy = true;
</script>
```
