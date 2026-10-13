
# syntax

```js
// ==========================================
// 1. SIGNALS ENGINE (Minimal Reactive Core)
// ==========================================
let activeEffect = null;

export function signal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  return {
    get value() {
      if (activeEffect) subscribers.add(activeEffect);
      return value;
    },
    set value(newValue) {
      if (value !== newValue) {
        value = newValue;
        // Notify all subscribed effects
        subscribers.forEach(fn => fn());
      }
    }
  };
}

export function effect(fn) {
  const execute = () => {
    activeEffect = execute;
    fn();
    activeEffect = null;
  };
  execute();
}
```

```js
// ==========================================
// 2. REACTIVE STORES (List, Dict, Tree)
// ==========================================

// Reactive Set wrapper (Name: List)
export class List {
  #set = new Set();
  #version = signal(0);

  add(item) {
    if (!this.#set.has(item)) {
      this.#set.add(item);
      this.#version.value++;
    }
  }

  delete(item) {
    if (this.#set.delete(item)) {
      this.#version.value++;
    }
  }

  has(item) {
    this.#version.value; // Register reactivity dependency
    return this.#set.has(item);
  }

  get items() {
    this.#version.value;
    return Array.from(this.#set);
  }
}

// Deep Reactive Object (Tree)
export class Tree {
  constructor(obj = {}) {
    return this.#makeReactive(obj);
  }

  #makeReactive(target) {
    const signalMap = new Map();

    return new Proxy(target, {
      get: (obj, prop) => {
        if (!signalMap.has(prop)) {
          const val = obj[prop];
          const isObject = typeof val === 'object' && val !== null;
          signalMap.set(prop, signal(isObject ? this.#makeReactive(val) : val));
        }
        return signalMap.get(prop).value;
      },
      set: (obj, prop, val) => {
        obj[prop] = val;
        const isObject = typeof val === 'object' && val !== null;
        if (!signalMap.has(prop)) {
          signalMap.set(prop, signal(isObject ? this.#makeReactive(val) : val));
        } else {
          signalMap.get(prop).value = isObject ? this.#makeReactive(val) : val;
        }
        return true;
      }
    });
  }
}
```

```js
// ==========================================
// 3. APP SINGLETON, COMMANDS, HOTKEYS & ROUTER
// ==========================================
export class App {
  static #instance = null;
  commands = new Map();
  hotkeys = new Map();
  route = signal(window.location.pathname);

  constructor() {
    if (App.#instance) return App.#instance;
    App.#instance = this;

    this.#initHotkeyListener();
    this.#initRouterListener();
  }

  static getInstance() {
    return App.#instance || new App();
  }

  // --- Command Registry ---
  registerCommand(id, handler) {
    this.commands.set(id, handler);
  }

  executeCommand(id, ...args) {
    const cmd = this.commands.get(id);
    if (!cmd) throw new Error(`Command "${id}" is not registered.`);
    return cmd(...args);
  }

  // --- Hotkey Registry ---
  registerHotkey(shortcut, commandId) {
    this.hotkeys.set(shortcut.toLowerCase(), commandId);
  }

  #initHotkeyListener() {
    window.addEventListener('keydown', (e) => {
      const keys = [];
      if (e.ctrlKey) keys.push('ctrl');
      if (e.metaKey) keys.push('meta');
      if (e.shiftKey) keys.push('shift');
      if (e.altKey) keys.push('alt');
      keys.push(e.key.toLowerCase());

      const combo = keys.join('+');
      const commandId = this.hotkeys.get(combo);
      if (commandId) {
        e.preventDefault();
        this.executeCommand(commandId);
      }
    });
  }

  // --- Router ---
  navigate(path) {
    window.history.pushState({}, '', path);
    this.route.value = path;
  }

  #initRouterListener() {
    window.addEventListener('popstate', () => {
      this.route.value = window.location.pathname;
    });
  }
}
```

```js
// ==========================================
// 4. COMPONENT BASE & AUTO-IMPORT
// ==========================================
export class Component extends HTMLElement {
  connectedCallback() {
    // Bind template updates to signals via fine-grained effect
    effect(() => {
      this.innerHTML = this.render();
    });
  }

  render() {
    return '';
  }
}

// Auto-register Custom Elements dynamically
export function autoImport(components) {
  Object.entries(components).forEach(([tagName, cls]) => {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, cls);
    }
  });
}
```

# rat.config.js

```js
export default {
  build: {

  }
};
```

# commands

```js
class CommandRegistry {
  #commands = new Map();

  constructor(rootElement = document) {
    // Listen for native HTML command events globally
    rootElement.addEventListener('command', (event) => {
      const cleanName = toUndashed(event.command);

      // If the command is registered in JS, execute it
      if (this.#commands.has(cleanName)) {
        this.exec(cleanName, { event, source: event.source });
      }
    });
  }

  register(name, handler) {
    this.#commands.set(toUndashed(name), handler);
    return this;
  }

  exec(name, ...args) {
    const handler = this.#commands.get(toUndashed(name));
    if (!handler) {
      console.warn(`[app.commands] Unknown command: "${name}"`);
      return;
    }
    return handler(...args);
  }
}

// Global Singleton
window.app = {
  commands: new CommandRegistry()
};
```

```html
<div id="app">
  <!-- Target is the app root or any parent element -->
  <button commandfor="app" command="--toggle-sidebar">
    Toggle Sidebar
  </button>
</div>
```

```js
// Register handler
app.commands.register('toggleSidebar', ({ source }) => {
  document.body.classList.toggle('sidebar-open');
  console.log('Sidebar toggled by:', source);
});

// Programmatic execution (e.g., from keybindings, websockets, or timers)
app.commands.exec('toggleSidebar');
```

```js
// Custom HTML template literal tag function
function html (strings, ...values) {
  // Combine template strings and interpolations
  const rawHtml = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');

  // Transform cmd="toggleSidebar" -> commandfor="app-root" command="--toggle-sidebar"
  const processedHtml = rawHtml.replace(/\bcmd=["']([^"']+)["']/g, (_, cmdName) => {
    return `commandfor="app-root" command="${toDashed(cmdName)}"`;
  });

  return processedHtml;
}
```
