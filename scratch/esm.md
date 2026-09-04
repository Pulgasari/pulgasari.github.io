# ESM Loading

##

##

## custom patterns

### proxy with `import()` on access

```javascript
function moduleProxy(path) {
  return new Proxy({}, {
    get(_, name) {
      return import(`${path}/${name}.js`).then(m => m.default ?? m);
    }
  });
}
```

usage:

```javascript
// usage
const components = moduleProxy('/.shared/js/components');

const AppSettings = await components.AppSettings;
const Icon        = await components.Icon;
```

### loader with `await`

```javascript
export async function loadModules (path, names) {
  const entries = await Promise.all(
    names.map(async name => {
      const module = await import(`${path}/${name}.js`);

      return [
        name,
        module.default ?? module
      ];
    })
  );

  return Object.fromEntries(entries);
}
```

```javascript
// usage
const {
  AppSettings,
  Icon,
  InstallTip,
  FileExplorer
} = await loadModules('/.shared/js/components', [
  'AppSettings',
  'Icon',
  'InstallTip',
  'FileExplorer'
]);
```

```javascript
const components = await loadModules('/.shared/js/components', {
  AppSettings: 'AppSettings.js',
  Icon: 'Icon.js',
  InstallTip: 'InstallTip.js',
  FileExplorer: 'FileExplorer.js'
});
```

###

```javascript
```

```javascript
```
