/* @aufbau/importmap.js
classic script. must be loaded before any module script.
usage: <script src="https://pulgasari.github.io/aufbau/importmap.js"></script>
*/
(() => {

  const baseURLs = {
    '@aufbau' : './',
    '@bunker' : 'https://pulgasari.github.io/bunker/',
    '@domina' : 'https://pulgasari.github.io/domina/',
    '@poo'    : 'https://pulgasari.github.io/poo/',
  };

  const rawMap = {
    "htm"              : "https://esm.sh/htm@3.1.1",
    "preact"           : "https://esm.sh/preact@10.20.1",
    "preact/hooks"     : "https://esm.sh/preact@10.20.1/hooks",
    "@preact/signals"  : "https://esm.sh/@preact/signals@1.2.2?external=preact",

    '@aufbau' : [
      'builders/docs', 'cache', 'elements', 'import', 'js',
      'kits', 'patterns',
      { plugins: ['client', 'vite', 'worker'] },
      'shaders', 'store', 'stylesheet', 'utils'
    ],
    '@bunker' : ['cache', 'core', 'db', 'files', 'kit', 'storage'],
    '@domina' : ['core'],
  };

  // Critical modules that will always be preloaded
  const PRELOAD_CRITICAL = ['@aufbau/kits', '@aufbau/elements'];

  /**
   * Expands shorthand configuration object into a standard importmap object.
   * Handles string entries, sub-object trees, custom file overrides, and folder mappings.
   */
  function expandImportMap(bases, config) {
    const imports = {};

    for (const [key, val] of Object.entries(config)) {
      // 1. Direct string mappings (e.g. "preact": "https://...")
      if (typeof val === 'string') {
        imports[key] = val;
        continue;
      }

      const base = bases[key] || '';

      const walk = (items, parent = '') => {
        for (const item of items) {
          if (typeof item === 'string') {
            const path = parent ? `${parent}/${item}` : item;
            const mapKey = `${key}/${path}`;

            // Handle entry point overrides or default to index.js
            const targetFile = path === 'kits'  ? 'kits/aufbau.js'
                             : path === 'utils' ? 'js/index.js'
                             : `${path}/index.js`;

            imports[mapKey] = `${base}${targetFile}`;
            imports[`${mapKey}/`] = `${base}${path}/`;
          } 
          else if (typeof item === 'object' && item !== null) {
            for (const [subKey, subItems] of Object.entries(item)) {
              const currentPath = parent ? `${parent}/${subKey}` : subKey;

              imports[`${key}/${currentPath}`]  = `${base}${currentPath}/index.js`;
              imports[`${key}/${currentPath}/`] = `${base}${currentPath}/`;

              if (Array.isArray(subItems)) {
                walk(subItems, currentPath);
              }
            }
          }
        }
      };

      if (Array.isArray(val)) {
        walk(val);
      }
    }

    return { imports };
  }

  const scriptEl = document.currentScript;
  const mapURL = scriptEl?.src;
  if (!mapURL) throw new Error('[aufbau] importmap injector must be a classic script');

  // 1. Expand shorthand configuration to standard importmap schema
  const map = expandImportMap(baseURLs, rawMap);

  // 2. Rebase relative URLs against the importmap script location
  const rebase = m => {
    for (const k in m) {
      m[k] = new URL(m[k], mapURL).href;
    }
    return m;
  };
  rebase(map.imports);

  // 3. Inject <script type="importmap">
  scriptEl.after(
    Object.assign(document.createElement('script'), {
      type: 'importmap',
      textContent: JSON.stringify(map)
    })
  );

  // 4. Inject <link rel="modulepreload"> for critical core modules
  const fragment = document.createDocumentFragment();
  for (const key of PRELOAD_CRITICAL) {
    const href = map.imports[key];
    if (href) {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = href;
      fragment.appendChild(link);
    }
  }

  if (fragment.childNodes.length > 0) {
    document.head.appendChild(fragment);
  }

})();
