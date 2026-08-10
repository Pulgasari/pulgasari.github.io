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
    // External dependencies
    "htm"              : "https://esm.sh/htm@3.1.1",
    "preact"           : "https://esm.sh/preact@10.20.1",
    "preact/hooks"     : "https://esm.sh/preact@10.20.1/hooks",
    "@preact/signals"  : "https://esm.sh/@preact/signals@1.2.2?external=preact",

    // Explicit non-standard overrides (no magic)
    "@aufbau/kits"            : "./kits/aufbau.js",
    "@aufbau/kits/preact-htm" : "./kits/preact-htm.js",
    "@aufbau/utils"           : "./js/index.js",

    // Standard module expansions (strictly follows dir/index.js and dir/)
    '@aufbau' : [
      { builders: ['docs'] },
      'cache',
      'elements',
      'import',
      'js',
      'patterns',
      'plugins',
      { plugins: ['client', 'vite', 'worker'] },
      'shaders',
      'store',
      'stylesheet',
    ],
    '@bunker' : ['cache', 'core', 'db', 'files', 'kit', 'storage'],
    '@domina' : ['core'],
  };

  const PRELOAD_CRITICAL = ['@aufbau/kits', '@aufbau/elements'];

  /**
   * Expands shorthand configuration object into a standard importmap.
   * Strings in rawMap are preserved as-is. Arrays strictly generate
   * `${path}/index.js` and `${path}/` without magic conditionals.
   */
  function expandImportMap(bases, config) {
    const imports = {};

    for (const [key, val] of Object.entries(config)) {
      // 1. Explicit string mappings
      if (typeof val === 'string') {
        // Resolve relative paths against prefix base if applicable
        const prefix = Object.keys(bases).find(p => key === p || key.startsWith(p + '/'));
        if (prefix && val.startsWith('./')) {
          imports[key] = `${bases[prefix]}${val.slice(2)}`;
        } else {
          imports[key] = val;
        }
        continue;
      }

      // 2. Strict directory expansions
      const base = bases[key] || '';

      const walk = (list, currentPath = '') => {
        for (const item of list) {
          if (typeof item === 'string') {
            const relPath = currentPath ? `${currentPath}/${item}` : item;
            const fullKey = `${key}/${relPath}`;

            imports[fullKey] = `${base}${relPath}/index.js`;
            imports[`${fullKey}/`] = `${base}${relPath}/`;
          } 
          else if (typeof item === 'object' && item !== null) {
            for (const [subKey, subItems] of Object.entries(item)) {
              const newPath = currentPath ? `${currentPath}/${subKey}` : subKey;

              // Folder mapping for the namespace only
              imports[`${key}/${newPath}/`] = `${base}${newPath}/`;

              if (Array.isArray(subItems)) {
                walk(subItems, newPath);
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

  const map = expandImportMap(baseURLs, rawMap);

  // Rebase relative URLs against the script location
  const rebase = m => {
    for (const k in m) m[k] = new URL(m[k], mapURL).href;
    return m;
  };
  rebase(map.imports);

  // Inject <script type="importmap">
  scriptEl.after(
    Object.assign(document.createElement('script'), {
      type: 'importmap',
      textContent: JSON.stringify(map)
    })
  );

  // Inject <link rel="modulepreload"> for critical modules
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
