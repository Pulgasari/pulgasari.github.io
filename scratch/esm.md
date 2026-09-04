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

### loader withvariadic names

```javascript
export async function modules(basePath, ...names) {
  const modules = await Promise.all(
    names.map(async name => {
      const mod = await import(`${basePath}/${name}.js`);
      return [name, mod.default ?? mod];
    })
  );

  return Object.fromEntries(modules);
}
```

```javascript
const {
  Foo,
  Bar,
  Baz
} = await modules('/foo', 'Foo', 'Bar', 'Baz');
```

### loader with ...

```javascript
const components = await modules('/.shared/js/components')(
  'AppSettings',
  'Icon',
  'InstallTip',
  'FileExplorer'
);

// or
const {
  AppSettings,
  Icon,
  InstallTip,
  FileExplorer
} = await components(
  'AppSettings',
  'Icon',
  'InstallTip',
  'FileExplorer'
);
```

```javascript
// could be used with everything
const { foo, bar } = await modules('/js/utils')('foo', 'bar');

const { Button, Dialog } = await modules('/js/ui')('Button', 'Dialog');

const { User, Project } = await modules('/js/models')('User', 'Project');
```

---

# müllhalde

```javascript
import AppSettings  from '/.shared/js/components/AppSettings.js';
import FileExplorer from '/.shared/js/components/FileExplorer.js';
import Icon         from '/.shared/js/components/Icon.js';
import InstallTip   from '/.shared/js/components/InstallTip.js';

import AppSettings  from '@/components/AppSettings.js';
import FileExplorer from '@/components/FileExplorer.js';
import Icon         from '@/components/Icon.js';
import InstallTip   from '@/components/InstallTip.js';

const AppSettings  = await zugriff.components.AppSettings;
const FileExplorer = await zugriff.components.FileExplorer;
const Icon         = await zugriff.components.Icon;
const InstallTip   = await zugriff.components.InstallTip;
```

```javascript
const app = zugriff.app('files');
import * as db     from './db.js';     app.db     = db;
import * as player from './player.js'; app.player = player;

const app = zugriff.app('files');
app.db     = await app.moduleProxy.db;
app.player = await app.moduleProxy.player;

const app = zugriff.app('files');
app.db     = await app.import('./db.js');
app.player = await app.import('./player.js');

const app = zugriff.app('files');
app.db     = await app.loadModule('./db.js');
app.player = await app.loadModule('./player.js');

const app = zugriff.app('files');
app.db     = await app.module['db'];
app.player = await app.module['player'];
```

```javascript
function moduleProxy (path) {
  return new Proxy({}, {
    get(_, name) {
      return import(`${path}/${name}.js`).then(m => m.default ?? m);
    }
  });
}

// usage
const components  = moduleProxy('/.shared/js/components');
const AppSettings = await components.AppSettings;
const Icon        = await components.Icon;

// reale praxis:
const AppSettings = await zugriff.components.AppSettings;
const Icon        = await zugriff.components.Icon;
```

```javascript
// Load all modules concurrently and extract default exports
const [AppSettings, FileExplorer, Icon, InstallTip] = await Promise.all([
  import('/.shared/js/components/AppSettings.js' ).then(m => m.default),
  import('/.shared/js/components/Icon.js'        ).then(m => m.default),
  import('/.shared/js/components/InstallTip.js'  ).then(m => m.default),
  import('/.shared/js/components/FileExplorer.js').then(m => m.default)
]);
```

```javascript
// Load modules sequentially using object destructuring for default exports
const { default: AppSettings }  = await import('/.shared/js/components/AppSettings.js');
const { default: FileExplorer } = await import('/.shared/js/components/FileExplorer.js');
const { default: Icon }         = await import('/.shared/js/components/Icon.js');
const { default: InstallTip }   = await import('/.shared/js/components/InstallTip.js');

```

```javascript
// Generic lazy loader for any ES module
function lazy (importFn) {
  let promise = null;

  return function load () {
    // 1. If already fetching/fetched, return the cached promise
    if (!promise) {
      // 2. Execute importFn() on first call and extract the default export
      promise = importFn().then(module => module.default || module);
    }
    return promise;
  };
}

// --- USAGE ---

// Define lazy modules (no HTTP request happens here!)
const getAppSettings  =           lazy(() => import('/.shared/js/components/AppSettings.js'));
const getFileExplorer =           lazy(() => import('/.shared/js/components/FileExplorer.js'));
const getComponent    = (name) => lazy(() => import(`/.shared/js/components/${name}.js`));

const { AppSettings, Icon, InstallTip, FileExplorer } = componentsProxy;

import AppSettings  from '/.shared/js/components/AppSettings.js';
import Icon         from '/.shared/js/components/Icon.js';
import InstallTip   from '/.shared/js/components/InstallTip.js';
import FileExplorer from '/.shared/js/components/FileExplorer.js';



// The network request is triggered ONLY when you execute the function:
async function openSettings() {
    const AppSettings = await getAppSettings();
    
    // Now AppSettings is loaded and ready to use
    console.log('Loaded module:', AppSettings);
}
```

```javascript
// pattern für sync laze preact components
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

const BASE_PATH = '/.shared/js/components';

export const components = new Proxy({}, {
    get(target, name) {
        if (typeof name !== 'string') return target[name];

        // Cache the generated proxy wrapper
        if (!target[name]) {
            let LoadedComponent = null;
            
            // Start loading the file in the background
            const importPromise = import(`${BASE_PATH}/${name}.js`).then(m => {
                LoadedComponent = m.default || m;
            });

            // Synchronous Preact component wrapper returned immediately
            target[name] = function ComponentProxy(props) {
                const [Comp, setComp] = useState(() => LoadedComponent);

                useEffect(() => {
                    if (!Comp) {
                        importPromise.then(() => setComp(() => LoadedComponent));
                    }
                }, []);

                return Comp ? h(Comp, props) : null;
            };
        }

        return target[name];
    }
});

// usage

import { components } from '/.shared/js/components.js';

// Fully synchronous destructuring, no promises, no await
const { AppSettings, Icon, InstallTip, FileExplorer } = components;

function App() {
    return (
        <div>
            <AppSettings />
            <Icon name="check" />
            <InstallTip />
            <FileExplorer />
        </div>
    );
}
```

```javascript
class App {
  url = (path) => new URL (path, this.baseURL);

  loadModuleByName = (name) => import(this.url(`${name}.js`));
  loadModuleByPath = (path) => import(this.url(path));

  get module = new Proxy({}, {
    get: (_, name) => this.loadModuleByName (name);
  });
}
```

```javascript
// usage
await app.load('player')

app.db     = await app.module.db;
app.player = await app.module.player;
```

```javascript
```




